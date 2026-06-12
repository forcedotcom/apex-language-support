import { Effect, Console } from 'effect';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  ApexClass,
  ApexEnum,
  ApexInnerClass,
  ApexNamespace,
} from '../types/apex';

export class GenerationError {
  readonly _tag = 'GenerationError';
  constructor(
    readonly message: string,
    readonly cause?: unknown,
  ) {}
}

/** Normalize type names: System.Url → System.URL, ANY → Object, MAP → Map */
const normalizeUrlType = (type: string): string =>
  type
    .replace(/\bSystem\.Url\b/g, 'System.URL')
    .replace(/\bANY\b/g, 'Object')
    .replace(/\bMAP\b/g, 'Map');

const uniqueBy = <T>(items: readonly T[], keyFn: (item: T) => string): T[] => {
  const seen = new Set<string>();
  const output: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(item);
  }
  return output;
};

// Apex rule: members of a global class cannot be less visible than global.
// Docs sometimes declare methods as public on a global class — upgrade them.
const resolveVisibility = (vis: string | undefined): string =>
  vis === 'public' ? 'global' : (vis ?? 'global');

/**
 * Generate stub files for all namespaces
 */
export const generateStubs = (namespaces: ApexNamespace[], outputDir: string) =>
  Effect.gen(function* () {
    yield* Console.log(`Generating stubs in: ${outputDir}`);

    yield* Effect.forEach(namespaces, (namespace) =>
      generateNamespaceStubs(namespace, outputDir),
    );

    yield* Console.log('Stub generation complete!');
  });

const generateNamespaceStubs = (namespace: ApexNamespace, outputDir: string) =>
  Effect.gen(function* () {
    const namespacePath = join(outputDir, namespace.name);
    yield* Console.log(`Generating namespace: ${namespace.name}`);

    yield* Effect.tryPromise({
      try: () => mkdir(namespacePath, { recursive: true }),
      catch: (error) =>
        new GenerationError(
          `Failed to create directory: ${namespacePath}`,
          error,
        ),
    });

    yield* Effect.forEach(namespace.classes, (apexClass) =>
      generateClassStub(apexClass, namespacePath),
    );

    yield* Effect.forEach(namespace.enums ?? [], (apexEnum) =>
      generateEnumStub(apexEnum, namespacePath),
    );
  });

const generateClassStub = (apexClass: ApexClass, outputPath: string) =>
  Effect.gen(function* () {
    const filePath = join(outputPath, `${apexClass.name}.cls`);
    const stubContent = generateClassContent(apexClass);

    yield* Effect.tryPromise({
      try: () => writeFile(filePath, stubContent, 'utf-8'),
      catch: (error) =>
        new GenerationError(`Failed to write stub file: ${filePath}`, error),
    });

    const kind = apexClass.isInterface ? 'interface' : 'class';
    yield* Console.log(
      `  Generated ${kind}: ${apexClass.namespace}.${apexClass.name}`,
    );
  });

const generateEnumStub = (apexEnum: ApexEnum, outputPath: string) =>
  Effect.gen(function* () {
    const filePath = join(outputPath, `${apexEnum.name}.cls`);
    const stubContent = generateEnumContent(apexEnum);

    yield* Effect.tryPromise({
      try: () => writeFile(filePath, stubContent, 'utf-8'),
      catch: (error) =>
        new GenerationError(
          `Failed to write enum stub file: ${filePath}`,
          error,
        ),
    });

    yield* Console.log(
      `  Generated enum: ${apexEnum.namespace}.${apexEnum.name}`,
    );
  });

/**
 * When a property's type in the docs is `Namespace.OuterClassName` (e.g. `Database.DMLOptions`),
 * the actual type is the inner class whose name matches the property name (camelCase → PascalCase).
 * Replace the outer-class type with the simple inner class name so the stub is correct.
 *
 * For example: `global Database.DMLOptions assignmentRuleHeader` → `global AssignmentRuleHeader assignmentRuleHeader`
 */
const resolveInnerClassPropertyType = (
  type: string,
  propName: string,
  innerClasses: readonly ApexInnerClass[],
  namespace: string,
  outerClassName: string,
): string => {
  if (innerClasses.length === 0) return type;

  const typeLower = type.toLowerCase();
  const outerFqn = `${namespace}.${outerClassName}`.toLowerCase();

  // Match the two-segment "Namespace.OuterClass" FQN (e.g. "Database.DMLOptions")
  // or the three-segment "Namespace.OuterClass.InnerClass" form the docs sometimes emit.
  const isOuterRef =
    typeLower === outerFqn || typeLower === outerClassName.toLowerCase();
  const isInnerRef =
    typeLower.startsWith(`${outerFqn}.`) ||
    typeLower.startsWith(`${outerClassName.toLowerCase()}.`);

  if (!isOuterRef && !isInnerRef) return type;

  if (isInnerRef) {
    // Docs already named the inner class — extract it and find the matching inner class.
    // If no inner class matches (e.g. the docs FQN resolves to a primitive like String),
    // fall back to the bare simple name so the stub is at least syntactically valid.
    const dotIdx = type.lastIndexOf('.');
    const innerName = type.slice(dotIdx + 1);
    const match = innerClasses.find(
      (ic) => ic.name.toLowerCase() === innerName.toLowerCase(),
    );
    return match ? match.name : innerName;
  }

  // Outer ref: find inner class by matching property name (camelCase → PascalCase, case-insensitive)
  const match = innerClasses.find(
    (ic) => ic.name.toLowerCase() === propName.toLowerCase(),
  );
  return match ? match.name : type;
};

const generateClassContent = (apexClass: ApexClass): string => {
  const lines: string[] = [];
  const keyword = apexClass.isInterface ? 'interface' : 'class';
  const innerClasses = apexClass.innerClasses ?? [];
  const uniqueConstructors = uniqueBy(
    apexClass.constructors ?? [],
    (ctor) =>
      `${ctor.visibility ?? 'global'}(${ctor.parameters
        .map((p) => normalizeUrlType(p.type))
        .join(',')})`,
  );
  const uniqueProperties = uniqueBy(
    apexClass.properties,
    (prop) =>
      `${prop.visibility ?? 'global'}|${prop.isStatic ? 'static' : 'instance'}|${normalizeUrlType(prop.type)}|${prop.name}`,
  );
  const uniqueMethods = uniqueBy(
    apexClass.methods,
    (method) =>
      `${method.visibility ?? 'global'}|${method.isStatic ? 'static' : 'instance'}|${normalizeUrlType(method.returnType)}|${method.name}(${method.parameters
        .map((p) => `${normalizeUrlType(p.type)} ${p.name}`)
        .join(',')})`,
  );
  const uniqueInnerExceptions = uniqueBy(
    apexClass.innerExceptions ?? [],
    (inner) => inner.name,
  );
  const uniqueInnerClasses = uniqueBy(innerClasses, (ic) => ic.name);

  if (apexClass.description) {
    lines.push('/**');
    lines.push(` * ${apexClass.description}`);
    lines.push(' */');
  }

  const extendsClause = apexClass.superClass
    ? ` extends ${apexClass.superClass}`
    : '';
  lines.push(`global ${keyword} ${apexClass.name}${extendsClause} {`);
  lines.push('');

  // Inject no-arg constructor when none were scraped (docs omit them for many classes)
  if (!apexClass.isInterface && uniqueConstructors.length === 0) {
    lines.push(`  global ${apexClass.name}() {}`);
    lines.push('');
  }

  for (const ctor of uniqueConstructors) {
    const vis = resolveVisibility(ctor.visibility);
    const params = ctor.parameters
      .map((p) => `${normalizeUrlType(p.type)} ${p.name}`)
      .join(', ');
    lines.push(`  ${vis} ${apexClass.name}(${params}) {}`);
    lines.push('');
  }

  for (const prop of uniqueProperties) {
    if (prop.description) {
      lines.push('  /**');
      lines.push(`   * ${prop.description}`);
      lines.push('   */');
    }
    const propVisibility = resolveVisibility(prop.visibility);
    const staticKeyword = prop.isStatic ? 'static ' : '';
    const resolvedType = resolveInnerClassPropertyType(
      normalizeUrlType(prop.type),
      prop.name,
      uniqueInnerClasses,
      apexClass.namespace,
      apexClass.name,
    );
    lines.push(
      `  ${propVisibility} ${staticKeyword}${resolvedType} ${prop.name};`,
    );
    lines.push('');
  }

  for (const method of uniqueMethods) {
    if (method.description) {
      lines.push('  /**');
      lines.push(`   * ${method.description}`);
      for (const param of method.parameters) {
        lines.push(`   * @param ${param.name} ${param.description || ''}`);
      }
      if (method.returnType !== 'void') {
        lines.push(`   * @return ${normalizeUrlType(method.returnType)}`);
      }
      lines.push('   */');
    }

    const methodVisibility = resolveVisibility(method.visibility);
    const staticKeyword = method.isStatic ? 'static ' : '';
    const returnTypeNorm = normalizeUrlType(method.returnType);
    const params = method.parameters
      .map((p) => `${normalizeUrlType(p.type)} ${p.name}`)
      .join(', ');

    if (apexClass.isInterface) {
      lines.push(
        `  ${staticKeyword}${returnTypeNorm} ${method.name}(${params});`,
      );
    } else {
      lines.push(
        `  ${methodVisibility} ${staticKeyword}${returnTypeNorm} ${method.name}(${params}) {}`,
      );
    }
    lines.push('');
  }

  // Inject clone() if not already scraped — every Apex stdlib class exposes it
  if (
    !apexClass.isInterface &&
    !uniqueMethods.some((m) => m.name === 'clone')
  ) {
    lines.push('  global Object clone() {}');
    lines.push('');
  }

  // Emit inner exception classes as nested class definitions
  for (const inner of uniqueInnerExceptions) {
    lines.push(`  global class ${inner.name} extends Exception {}`);
    lines.push('');
  }

  // Emit inner classes as nested class definitions
  for (const inner of uniqueInnerClasses) {
    lines.push(generateInnerClassContent(inner));
    lines.push('');
  }

  lines.push('}');
  return lines.join('\n');
};

const generateInnerClassContent = (inner: ApexInnerClass): string => {
  const lines: string[] = [];
  const keyword = inner.isInterface ? 'interface' : 'class';
  const uniqueConstructors = uniqueBy(
    inner.constructors ?? [],
    (ctor) =>
      `${ctor.visibility ?? 'global'}(${ctor.parameters
        .map((p) => normalizeUrlType(p.type))
        .join(',')})`,
  );
  const uniqueProperties = uniqueBy(
    inner.properties,
    (prop) =>
      `${prop.visibility ?? 'global'}|${prop.isStatic ? 'static' : 'instance'}|${normalizeUrlType(prop.type)}|${prop.name}`,
  );
  const uniqueMethods = uniqueBy(
    inner.methods,
    (method) =>
      `${method.visibility ?? 'global'}|${method.isStatic ? 'static' : 'instance'}|${normalizeUrlType(method.returnType)}|${method.name}(${method.parameters
        .map((p) => `${normalizeUrlType(p.type)} ${p.name}`)
        .join(',')})`,
  );
  const uniqueInnerExceptions = uniqueBy(
    inner.innerExceptions ?? [],
    (exc) => exc.name,
  );

  if (inner.description) {
    lines.push('  /**');
    lines.push(`   * ${inner.description}`);
    lines.push('   */');
  }

  const extendsClause = inner.superClass ? ` extends ${inner.superClass}` : '';
  lines.push(`  global ${keyword} ${inner.name}${extendsClause} {`);
  lines.push('');

  // Inject no-arg constructor when none were scraped
  if (!inner.isInterface && uniqueConstructors.length === 0) {
    lines.push(`    global ${inner.name}() {}`);
    lines.push('');
  }

  for (const ctor of uniqueConstructors) {
    const vis = resolveVisibility(ctor.visibility);
    const params = ctor.parameters
      .map((p) => `${normalizeUrlType(p.type)} ${p.name}`)
      .join(', ');
    lines.push(`    ${vis} ${inner.name}(${params}) {}`);
    lines.push('');
  }

  for (const prop of uniqueProperties) {
    if (prop.description) {
      lines.push('    /**');
      lines.push(`     * ${prop.description}`);
      lines.push('     */');
    }
    const propVisibility = resolveVisibility(prop.visibility);
    const staticKeyword = prop.isStatic ? 'static ' : '';
    lines.push(
      `    ${propVisibility} ${staticKeyword}${normalizeUrlType(prop.type)} ${prop.name};`,
    );
    lines.push('');
  }

  for (const method of uniqueMethods) {
    if (method.description) {
      lines.push('    /**');
      lines.push(`     * ${method.description}`);
      for (const param of method.parameters) {
        lines.push(`     * @param ${param.name} ${param.description || ''}`);
      }
      if (method.returnType !== 'void') {
        lines.push(`     * @return ${normalizeUrlType(method.returnType)}`);
      }
      lines.push('     */');
    }
    const methodVisibility = resolveVisibility(method.visibility);
    const staticKeyword = method.isStatic ? 'static ' : '';
    const returnTypeNorm = normalizeUrlType(method.returnType);
    const params = method.parameters
      .map((p) => `${normalizeUrlType(p.type)} ${p.name}`)
      .join(', ');
    if (inner.isInterface) {
      lines.push(
        `    ${staticKeyword}${returnTypeNorm} ${method.name}(${params});`,
      );
    } else {
      lines.push(
        `    ${methodVisibility} ${staticKeyword}${returnTypeNorm} ${method.name}(${params}) {}`,
      );
    }
    lines.push('');
  }

  // Inject clone() if not already scraped — every Apex stdlib class exposes it
  if (!inner.isInterface && !uniqueMethods.some((m) => m.name === 'clone')) {
    lines.push('    global Object clone() {}');
    lines.push('');
  }

  for (const exc of uniqueInnerExceptions) {
    lines.push(`    global class ${exc.name} extends Exception {}`);
    lines.push('');
  }

  lines.push('  }');
  return lines.join('\n');
};

// Enum values that exist in the Apex runtime but are omitted from the public docs.
// Keyed by "Namespace.ClassName" — values are appended after deduplication.
const ENUM_EXTRA_VALUES: Record<string, string[]> = {
  'System.LoggingLevel': ['INTERNAL'],
};

const generateEnumContent = (apexEnum: ApexEnum): string => {
  const lines: string[] = [];
  const extra = (
    ENUM_EXTRA_VALUES[`${apexEnum.namespace}.${apexEnum.name}`] ?? []
  ).map((name) => ({ name }));
  const uniqueValues = uniqueBy([...apexEnum.values, ...extra], (v) => v.name);

  if (apexEnum.description) {
    lines.push('/**');
    lines.push(` * ${apexEnum.description}`);
    lines.push(' */');
  }

  lines.push(`global enum ${apexEnum.name} {`);

  if (uniqueValues.length > 0) {
    lines.push(
      ...uniqueValues.map(
        (v, i) => `  ${v.name}${i < uniqueValues.length - 1 ? ',' : ''}`,
      ),
    );
  }

  lines.push('}');
  return lines.join('\n');
};
