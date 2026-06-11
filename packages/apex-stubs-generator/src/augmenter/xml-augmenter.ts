import { Effect, Console } from 'effect';
import { readFile } from 'node:fs/promises';
import { XMLParser } from 'fast-xml-parser';
import {
  ApexClass,
  ApexMethod,
  ApexNamespace,
  ApexParameter,
} from '../types/apex';

// Boilerplate inherited from Object, Enum, Exception — skip when augmenting.
const BOILERPLATE = new Set([
  'hashcode',
  'equals',
  'tostring',
  'getbuildversion',
  'values',
  'valueof',
  'ordinal',
  'gettypename',
  'getmessage',
  'setmessage',
  'initcause',
  'getstacktracestring',
  'getlinenumber',
  'getinaccessiblefields',
  'getcause',
]);

type XmlParam = { '@_type': string; '@_doc'?: string };
type XmlMethod = {
  '@_name': string;
  '@_returnType': string;
  '@_isStatic'?: string;
  param?: XmlParam[];
};
type XmlType = { '@_name': string; method?: XmlMethod[] };
type XmlNamespace = { '@_name': string; type?: XmlType[] };
type XmlRoot = { types: { namespace: XmlNamespace[] } };

type MethodEntry = {
  name: string;
  returnType: string;
  isStatic: boolean;
  params: { type: string; doc: string }[];
};

type XmlTypeMap = Map<string, Map<string, MethodEntry[]>>;

const parseXml = (raw: string): XmlTypeMap => {
  // transformTagName renames <constructor> to avoid fast-xml-parser's
  // prototype-pollution guard (we own this file and only read <method> nodes).
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => ['namespace', 'type', 'method', 'param'].includes(name),
    transformTagName: (name) =>
      name === 'constructor' ? '_constructor' : name,
  });

  const root = parser.parse(raw) as XmlRoot;
  const map: XmlTypeMap = new Map();

  for (const ns of root.types.namespace ?? []) {
    const nsKey = ns['@_name'].toLowerCase();
    const typeMap = new Map<string, MethodEntry[]>();
    map.set(nsKey, typeMap);

    for (const type of ns.type ?? []) {
      const typeKey = type['@_name'].toLowerCase();
      const methods: MethodEntry[] = [];
      typeMap.set(typeKey, methods);

      for (const m of type.method ?? []) {
        const name = m['@_name'];
        if (BOILERPLATE.has(name.toLowerCase())) continue;
        methods.push({
          name,
          returnType: m['@_returnType'] ?? 'void',
          isStatic: m['@_isStatic'] === 'true',
          params: (m.param ?? []).map((p, i) => ({
            type: p['@_type'],
            doc: p['@_doc'] || `arg${i}`,
          })),
        });
      }
    }
  }

  return map;
};

const sigKey = (name: string, paramCount: number) =>
  `${name.toLowerCase()}|${paramCount}`;

const classMethodSigSet = (cls: ApexClass): Set<string> => {
  const sigs = new Set<string>();
  for (const m of cls.methods) {
    sigs.add(sigKey(m.name, m.parameters.length));
  }
  return sigs;
};

// Walk the superClass chain within the scraped namespaces to collect all
// method signatures available through inheritance. Stops at cycles.
const ancestorMethodSigs = (
  cls: ApexClass,
  classIndex: Map<string, ApexClass>,
  cache: Map<string, Set<string>>,
): Set<string> => {
  const key = `${cls.namespace}.${cls.name}`;
  if (cache.has(key)) return cache.get(key)!;

  const sigs = new Set<string>();
  cache.set(key, sigs); // set early to break cycles

  if (!cls.superClass) return sigs;

  // superClass may be "Namespace.ClassName" or bare "ClassName"
  const superKey = cls.superClass.includes('.')
    ? cls.superClass.toLowerCase()
    : `${cls.namespace.toLowerCase()}.${cls.superClass.toLowerCase()}`;

  const superCls = classIndex.get(superKey);
  if (!superCls) return sigs;

  for (const m of superCls.methods)
    sigs.add(sigKey(m.name, m.parameters.length));
  for (const s of ancestorMethodSigs(superCls, classIndex, cache)) sigs.add(s);

  return sigs;
};

const buildClassIndex = (
  namespaces: ApexNamespace[],
): Map<string, ApexClass> => {
  const index = new Map<string, ApexClass>();
  for (const ns of namespaces) {
    for (const cls of ns.classes) {
      index.set(`${ns.name.toLowerCase()}.${cls.name.toLowerCase()}`, cls);
    }
  }
  return index;
};

const buildAugmentedClass = (
  cls: ApexClass,
  xmlMethods: MethodEntry[],
  ownSigs: Set<string>,
  ancestorSigs: Set<string>,
): { cls: ApexClass; added: number } => {
  const newMethods: ApexMethod[] = [];

  for (const xm of xmlMethods) {
    const key = sigKey(xm.name, xm.params.length);
    if (ownSigs.has(key) || ancestorSigs.has(key)) continue;

    const parameters = xm.params.map(
      (p) => new ApexParameter({ name: p.doc, type: p.type }),
    );

    const paramStr = parameters.map((p) => `${p.type} ${p.name}`).join(', ');
    const signature = `${xm.isStatic ? 'static ' : ''}${xm.returnType} ${xm.name}(${paramStr})`;

    newMethods.push(
      new ApexMethod({
        name: xm.name,
        returnType: xm.returnType,
        parameters,
        isStatic: xm.isStatic,
        visibility: 'global',
        signature,
      }),
    );

    ownSigs.add(key); // prevent duplicate XML entries for the same sig
  }

  if (newMethods.length === 0) return { cls, added: 0 };

  return {
    cls: new ApexClass({ ...cls, methods: [...cls.methods, ...newMethods] }),
    added: newMethods.length,
  };
};

/**
 * Reads the bytecode XML at xmlPath and merges any method signatures present
 * in the XML but absent from both the class and its ancestor chain into the
 * scraped namespaces. Returns the original namespaces unchanged (with a
 * console notice) if the file is absent or unreadable.
 */
export const augmentFromBytecodeXml = (
  namespaces: ApexNamespace[],
  xmlPath: string,
): Effect.Effect<ApexNamespace[]> =>
  Effect.gen(function* () {
    const raw = yield* Effect.tryPromise({
      try: () => readFile(xmlPath, 'utf-8'),
      catch: () => null,
    }).pipe(Effect.catchAll(() => Effect.succeed(null)));

    if (raw === null) {
      yield* Console.log(
        `  No bytecode XML found at ${xmlPath} — skipping augmentation.`,
      );
      return namespaces;
    }

    yield* Console.log(`  Parsing bytecode XML: ${xmlPath}`);
    const xmlMap = parseXml(raw);
    const classIndex = buildClassIndex(namespaces);
    const ancestorCache = new Map<string, Set<string>>();

    let totalAdded = 0;
    let classesAugmented = 0;

    const augmentedNamespaces = namespaces.map((ns) => {
      const nsLower = ns.name.toLowerCase();
      const xmlNs = xmlMap.get(nsLower);
      if (!xmlNs) return ns;

      const augmentedClasses = ns.classes.map((cls) => {
        const clsLower = cls.name.toLowerCase();
        const xmlMethods =
          xmlNs.get(clsLower) ?? xmlNs.get(`${nsLower}.${clsLower}`);
        if (!xmlMethods || xmlMethods.length === 0) return cls;

        const ownSigs = classMethodSigSet(cls);
        const ancSigs = ancestorMethodSigs(cls, classIndex, ancestorCache);
        const { cls: augmented, added } = buildAugmentedClass(
          cls,
          xmlMethods,
          ownSigs,
          ancSigs,
        );

        if (added > 0) {
          totalAdded += added;
          classesAugmented++;
        }
        return augmented;
      });

      return new ApexNamespace({ ...ns, classes: augmentedClasses });
    });

    yield* Console.log(
      `  Augmented ${totalAdded} method${totalAdded === 1 ? '' : 's'} across ${classesAugmented} class${classesAugmented === 1 ? '' : 'es'} from bytecode XML.`,
    );

    return augmentedNamespaces;
  });
