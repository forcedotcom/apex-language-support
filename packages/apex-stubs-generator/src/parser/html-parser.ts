import { Effect, Console } from 'effect';
import {
  ApexConstructor,
  ApexMethod,
  ApexParameter,
  ApexEnumValue,
  ApexProperty,
} from '../types/apex';

export class HtmlParsingError {
  readonly _tag = 'HtmlParsingError';
  constructor(
    readonly message: string,
    readonly cause?: unknown,
  ) {}
}

/**
 * Strip HTML tags and decode HTML entities to get clean text content.
 * Tags are replaced with a space so adjacent words don't merge.
 */
export const stripHtmlTags = (html: string): string => {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Strip HTML tags from inline code content (e.g. inside <samp>) without inserting
 * spaces. This prevents artifacts like `Database. QueryLocator` from anchor tags,
 * or `describeDataCategory GroupStructures` from <wbr> elements.
 *
 * Order is critical: HTML tags must be stripped BEFORE entity decoding so that
 * `List&lt;Schema.X&gt;` is not confused with an HTML element.
 */
const stripCodeTags = (html: string): string =>
  html
    .replace(/\s*<wbr\s*\/?>\s*/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\.\s+/g, '.')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Split a parameter list string by commas, respecting angle-bracket nesting so that
 * generic type arguments like `Map<String, Object>` are not split at the inner comma.
 */
const splitParams = (str: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '<') depth++;
    else if (str[i] === '>') depth--;
    else if (str[i] === ',' && depth === 0) {
      parts.push(str.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(str.slice(start));
  return parts;
};

const extractSignatures = (html: string): string[] => {
  const signatures: string[] = [];
  // Some pages use class="codeph apex_code", others use class="codeph " (no apex_code).
  // Match any <samp class="codeph..."> after a Signature/Syntax heading.
  // h4: used on multi-member pages (methods listing pages) and inline nested topics (Reports namespace uses "Syntax").
  // h2: used on individual sub-pages (constructor/property/method detail pages).
  const signaturePattern =
    /<h(?:2|4)[^>]*>(?:Signature|Syntax)<\/h(?:2|4)>\s*<p[^>]*><samp[^>]*codeph[^>]*>([\s\S]*?)<\/samp><\/p>/gi;

  let match;
  while ((match = signaturePattern.exec(html)) !== null) {
    signatures.push(stripCodeTags(match[1]));
  }

  return signatures;
};

const parseMethodSignature = (signature: string): ApexMethod | null => {
  const normalizedSignature = signature.replace(/\s+/g, ' ').trim();

  if (normalizedSignature.includes('{') || normalizedSignature.includes('}')) {
    return null;
  }

  const methodPattern =
    /^(public|global|private)\s+(static\s+)?([A-Za-z0-9_.<>,\[\]\s]+?)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)$/;
  const match = normalizedSignature.match(methodPattern);
  if (!match) {
    return null;
  }

  const visibility = match[1];
  const isStatic = !!match[2];

  let rawReturn = match[3].trim();
  let methodName = match[4];

  // Docs sometimes insert a spurious space inside a camelCase method name (e.g. from
  // <wbr> or line-wrap artifacts), causing the regex to absorb the first fragment into
  // the return type. Detect this: if the return type ends with a lowercase-starting word
  // AND the parsed method name starts with an uppercase letter, the last word of the
  // return type is actually the start of the real method name.
  const returnTypeParts = rawReturn.split(/\s+/);
  const lastReturnPart = returnTypeParts[returnTypeParts.length - 1] ?? '';
  if (
    returnTypeParts.length > 1 &&
    /^[a-z]/.test(lastReturnPart) &&
    /^[A-Z]/.test(methodName)
  ) {
    rawReturn = returnTypeParts.slice(0, -1).join(' ').trim();
    methodName = lastReturnPart + methodName;
  }

  // Normalize 'Void' to 'void' — docs capitalize it but Apex uses lowercase
  const returnType = rawReturn === 'Void' ? 'void' : rawReturn;
  const paramsStr = match[5].trim();

  const parameters: ApexParameter[] = [];
  if (paramsStr) {
    for (const paramPart of splitParams(paramsStr)) {
      const trimmed = paramPart.trim();
      if (!trimmed) continue;

      const paramMatch = trimmed.match(
        /^([A-Za-z0-9_.<>,\[\]\s]+)\s+([a-zA-Z_][a-zA-Z0-9_]*)$/,
      );
      if (paramMatch) {
        parameters.push(
          new ApexParameter({
            type: paramMatch[1].trim(),
            name: paramMatch[2].trim(),
          }),
        );
      }
    }
  }

  return new ApexMethod({
    name: methodName,
    returnType,
    parameters,
    isStatic,
    visibility,
    signature: normalizedSignature,
  });
};

const extractClassDescription = (html: string): string | undefined => {
  const descPattern = /<div class="shortdesc">([\s\S]*?)<\/div>/i;
  const match = html.match(descPattern);
  return match ? stripHtmlTags(match[1]) : undefined;
};

const extractMethodDescription = (
  html: string,
  methodName: string,
): string | undefined => {
  const methodSectionPattern = new RegExp(
    `<h3[^>]*>${methodName}[^<]*</h3>[\\s\\S]*?<div class="shortdesc">([\\s\\S]*?)</div>`,
    'i',
  );
  const match = html.match(methodSectionPattern);
  return match ? stripHtmlTags(match[1]) : undefined;
};

const extractParameterDescriptions = (
  html: string,
  methodName: string,
): Map<string, string> => {
  const paramDescriptions = new Map<string, string>();

  const methodSectionPattern = new RegExp(
    `<h3[^>]*>${methodName}[^<]*</h3>([\\s\\S]*?)(?=<h[23]|<div class="topic"|$)`,
    'i',
  );
  const sectionMatch = html.match(methodSectionPattern);
  if (!sectionMatch) return paramDescriptions;

  const paramsPattern =
    /<h4[^>]*>Parameters<\/h4>[\s\S]*?<dl class="dl detailList">([\s\S]*?)<\/dl>/i;
  const paramsMatch = sectionMatch[1].match(paramsPattern);
  if (!paramsMatch) return paramDescriptions;

  const paramItemPattern =
    /<dt[^>]*><var[^>]*>([^<]+)<\/var><\/dt>[\s\S]*?<dd[^>]*>Type:[\s\S]*?<\/dd>\s*(?:<dd[^>]*>([\s\S]*?)<\/dd>)?/gi;

  let paramMatch;
  while ((paramMatch = paramItemPattern.exec(paramsMatch[1])) !== null) {
    const paramName = paramMatch[1].trim();
    const paramDesc = paramMatch[2] ? stripHtmlTags(paramMatch[2]) : '';
    if (paramDesc.trim()) {
      paramDescriptions.set(paramName, paramDesc);
    }
  }

  return paramDescriptions;
};

/**
 * Extract methods from HTML content with descriptions
 */
export const extractMethodsFromHtml = (html: string, className: string) =>
  Effect.gen(function* () {
    yield* Console.log(`Parsing HTML for class: ${className}`);

    const methods: ApexMethod[] = [];
    const signatures = extractSignatures(html);

    yield* Console.log(`  Found ${signatures.length} signatures`);

    for (const signature of signatures) {
      const method = parseMethodSignature(signature);
      if (method) {
        const description = extractMethodDescription(html, method.name);
        const paramDescriptions = extractParameterDescriptions(
          html,
          method.name,
        );

        const updatedParameters = method.parameters.map(
          (param) =>
            new ApexParameter({
              type: param.type,
              name: param.name,
              description: paramDescriptions.get(param.name),
            }),
        );

        methods.push(
          new ApexMethod({
            name: method.name,
            returnType: method.returnType,
            parameters: updatedParameters,
            isStatic: method.isStatic,
            visibility: method.visibility,
            signature: method.signature,
            description,
          }),
        );

        yield* Console.log(`    Parsed: ${method.name}`);
      } else {
        yield* Console.log(`    Failed to parse: ${signature}`);
      }
    }

    yield* Console.log(`Extracted ${methods.length} methods from ${className}`);
    return methods;
  });

/**
 * Parse a constructor signature string into an ApexConstructor.
 * Constructors have no return type: `(public|global|private) ClassName(params)`.
 * Returns null for no-arg constructors (those are omitted from stubs).
 */
const parseConstructorSignature = (
  signature: string,
  className: string,
): ApexConstructor | null => {
  const normalized = signature.replace(/\s+/g, ' ').trim();
  const ctorPattern =
    /^(public|global|private)\s+([A-Za-z][A-Za-z0-9_]*)\s*\(([^)]*)\)$/;
  const match = normalized.match(ctorPattern);
  if (!match) return null;

  const visibility = match[1];
  const name = match[2];
  const paramsStr = match[3].trim();

  if (name !== className) return null;
  if (!paramsStr) return null;

  const parameters: ApexParameter[] = [];
  for (const paramPart of splitParams(paramsStr)) {
    const trimmed = paramPart.trim();
    if (!trimmed) continue;
    const paramMatch = trimmed.match(
      /^([A-Za-z0-9_.<>,\[\]\s]+)\s+([a-zA-Z_][a-zA-Z0-9_]*)$/,
    );
    if (paramMatch) {
      parameters.push(
        new ApexParameter({
          type: paramMatch[1].trim(),
          name: paramMatch[2].trim(),
        }),
      );
    }
  }

  if (parameters.length === 0) return null;

  return new ApexConstructor({ parameters, visibility });
};

/**
 * Extract constructors with parameters from HTML content.
 * No-arg constructors are intentionally excluded.
 */
export const extractConstructorsFromHtml = (html: string, className: string) =>
  Effect.gen(function* () {
    const constructors: ApexConstructor[] = [];
    const signatures = extractSignatures(html);

    for (const signature of signatures) {
      const ctor = parseConstructorSignature(signature, className);
      if (ctor) {
        constructors.push(ctor);
        yield* Console.log(
          `    Parsed constructor: ${className}(${ctor.parameters.map((p) => p.type).join(', ')})`,
        );
      }
    }

    yield* Console.log(
      `Extracted ${constructors.length} constructors from ${className}`,
    );
    return constructors;
  });

/**
 * Extract class description from HTML
 */
export const extractClassDescriptionFromHtml = (html: string) =>
  Effect.gen(function* () {
    return extractClassDescription(html);
  });

/**
 * Returns true when the page's shortdesc marks the class as internal-use only.
 *
 * Known variants in Salesforce docs:
 *   - "This class and its methods are for internal use only."
 *   - "The methods and properties in this class are for internal use only."
 */
export const isInternalUseOnly = (html: string): boolean => {
  const desc = extractClassDescription(html) ?? '';
  return /for internal use only/i.test(desc);
};

/**
 * Extract the superclass name from a class/interface documentation page.
 *
 * Three variants appear in Salesforce docs:
 *   1. `extends <a ...><samp class="codeph nolang">BaseRequest</samp></a>`
 *      — used by most namespaces (e.g. CommercePayments)
 *   2. `extends <a ...>Cache.Partition</a>`
 *      — plain link text, no <samp> wrapper (e.g. Cache namespace)
 *   3. `Subclass of <a ...>ConnectApi.AbstractContentHubItemType</a>`
 *      — uses "Subclass of" prose instead of "extends" keyword (e.g. ConnectApi)
 *
 * Returns the class name as written in the docs (may be namespace-qualified,
 * e.g. "Cache.Partition"). Apex accepts both qualified and unqualified forms.
 */
export const extractSuperClassFromHtml = (html: string): string | undefined => {
  // Variant 1: link wraps a <samp> element
  const sampPattern =
    /\bextends\s+(?:<a[^>]*>)?<samp[^>]*codeph[^>]*>([^<]+)<\/samp>/i;
  const sampMatch = html.match(sampPattern);
  if (sampMatch) return stripCodeTags(sampMatch[1]) || undefined;

  // Variant 2: "extends" keyword with plain link text
  const linkPattern = /\bextends\s+<a[^>]*>([^<]+)<\/a>/i;
  const linkMatch = html.match(linkPattern);
  if (linkMatch) return stripHtmlTags(linkMatch[1]).trim() || undefined;

  // Variant 3: "Subclass of <a>TypeName</a>" prose (used by ConnectApi and others)
  const subclassPattern = /\bSubclass of\s+<a[^>]*>([^<]+)<\/a>/i;
  const subclassMatch = html.match(subclassPattern);
  return subclassMatch
    ? stripHtmlTags(subclassMatch[1]).trim() || undefined
    : undefined;
};

/**
 * Extract enum values from an enum documentation page
 */
export const extractEnumValuesFromHtml = (html: string, enumName: string) =>
  Effect.gen(function* () {
    yield* Console.log(`Parsing enum values for: ${enumName}`);

    const values: ApexEnumValue[] = [];
    const seen = new Set<string>();

    const sampPattern = /<samp[^>]*apex_code[^>]*>([A-Z_][A-Z0-9_]*)<\/samp>/g;
    let match;

    while ((match = sampPattern.exec(html)) !== null) {
      const valueName = match[1].trim();
      if (valueName && !seen.has(valueName)) {
        seen.add(valueName);
        values.push(new ApexEnumValue({ name: valueName }));
      }
    }

    if (values.length === 0) {
      const tdPattern = /<td[^>]*>\s*<p[^>]*>([A-Z_][A-Z0-9_]*)<\/p>\s*<\/td>/g;
      while ((match = tdPattern.exec(html)) !== null) {
        const valueName = match[1].trim();
        if (valueName && !seen.has(valueName)) {
          seen.add(valueName);
          values.push(new ApexEnumValue({ name: valueName }));
        }
      }
    }

    // Format 3: data-title="Value" table (e.g. CommercePayments, Auth, CommerceTax enums).
    // Values are in <samp class="codeph "> (no apex_code class) with mixed-case names
    // like "Business", "Individual", "Visa". Only run if previous patterns found nothing.
    if (values.length === 0 && /<th[^>]*>Value<\/th>/i.test(html)) {
      const trPattern = /<tr>([\s\S]*?)<\/tr>/gi;
      let trMatch;
      while ((trMatch = trPattern.exec(html)) !== null) {
        const rowHtml = trMatch[1];
        const valueMatch = rowHtml.match(
          /data-title="Value"[^>]*>[\s\S]*?<samp[^>]*codeph[^>]*>([^<]+)<\/samp>/i,
        );
        if (valueMatch) {
          const valueName = valueMatch[1].trim();
          if (valueName && !seen.has(valueName)) {
            seen.add(valueName);
            values.push(new ApexEnumValue({ name: valueName }));
          }
        }
      }
    }

    yield* Console.log(`  Found ${values.length} enum values for ${enumName}`);
    return values;
  });

export interface ExtractedExceptionClass {
  /** Simple class name, e.g. "OrgCacheException" */
  name: string;
  /** Parent class name when this is an inner class, e.g. "Org" for "Org.OrgCacheException" */
  parentClass?: string;
}

/**
 * Extract multiple exception class names from an aggregated exceptions page.
 *
 * Handles three common formats:
 *   1. <h2/h3> headings with anchor links (most namespace exception pages)
 *   2. <span class="apiname">ClassName</span>
 *   3. <samp class="codeph apex_code">[Parent.]ClassName</samp> in table cells
 *      (used by ConnectApi and Cache exception pages)
 *
 * Returns structured results preserving parent class info for inner exceptions.
 */
export const extractExceptionClassNamesFromHtml = (
  html: string,
  namespace: string,
) =>
  Effect.gen(function* () {
    yield* Console.log(`Parsing exception classes for namespace: ${namespace}`);

    const results: ExtractedExceptionClass[] = [];
    const seen = new Set<string>();

    const addName = (raw: string) => {
      const cleaned = raw.replace(/\u200b/g, '').trim();
      const dotIdx = cleaned.lastIndexOf('.');
      const name = dotIdx >= 0 ? cleaned.slice(dotIdx + 1).trim() : cleaned;
      const parentClass =
        dotIdx >= 0 ? cleaned.slice(0, dotIdx).trim() : undefined;
      if (name && !seen.has(name)) {
        seen.add(name);
        results.push({ name, parentClass });
      }
    };

    let match;

    // Format 1: heading with anchor
    const headingPattern =
      /<h[23][^>]*>\s*<a[^>]*>\s*([A-Za-z][A-Za-z0-9]*Exception[A-Za-z0-9]*)\s*<\/a>\s*<\/h[23]>/gi;
    while ((match = headingPattern.exec(html)) !== null) addName(match[1]);

    // Format 2: <span class="apiname">
    if (results.length === 0) {
      const apinamePattern =
        /<span[^>]*class="[^"]*apiname[^"]*"[^>]*>([A-Za-z][A-Za-z0-9]*Exception[A-Za-z0-9]*)<\/span>/gi;
      while ((match = apinamePattern.exec(html)) !== null) addName(match[1]);
    }

    // Format 3: <samp class="codeph apex_code">[Parent.]ClassName</samp> in table cells
    if (results.length === 0) {
      const sampPattern =
        /<samp[^>]*class="codeph apex_code"[^>]*>([A-Za-z][A-Za-z0-9.​\u200b]*Exception[A-Za-z0-9]*)<\/samp>/gi;
      while ((match = sampPattern.exec(html)) !== null) addName(match[1]);
    }

    yield* Console.log(`  Found ${results.length} exception classes`);
    return results;
  });

/**
 * Extract properties from a documentation page that uses a property table.
 *
 * Three table variants exist in the Salesforce docs:
 *   - Input classes:           <th>Property</th>      / <td data-title="Property">
 *   - Output classes:          <th>Property Name</th>  / <td data-title="Property Name">
 *   - Abstract/output classes: <th>Name</th>           / <td data-title="Name">
 *
 * All variants use <samp class="codeph apex_code">propName</samp> for the property name
 * and a sibling <td data-title="Type"> for the type. The presence of both a name-like
 * column AND a Type column distinguishes property tables from other tables (e.g. enum
 * value tables). Method/constructor pages have neither header and are unaffected.
 */
export const extractPropertiesFromHtml = (html: string, className: string) =>
  Effect.gen(function* () {
    yield* Console.log(`Parsing properties for: ${className}`);

    const properties: ApexProperty[] = [];

    // Only process pages that have a property name column AND a Type column.
    // Requiring both prevents false-positives on enum/value tables.
    const hasNameColumn = /<th[^>]*>(?:Property(?:\s+Name)?|Name)<\/th>/i.test(
      html,
    );
    const hasTypeColumn = /<th[^>]*>Type<\/th>/i.test(html);
    if (!hasNameColumn || !hasTypeColumn) {
      return properties;
    }

    // Match each <tr>…</tr> in the document
    const trPattern = /<tr>([\s\S]*?)<\/tr>/gi;
    let trMatch;

    while ((trMatch = trPattern.exec(html)) !== null) {
      const rowHtml = trMatch[1];

      // Property name: td with data-title="Property", "Property Name", or "Name" containing a <samp>
      const nameMatch = rowHtml.match(
        /data-title="(?:Property(?:\s+Name)?|Name)"[^>]*>[\s\S]*?<samp[^>]*codeph[^>]*>([\s\S]*?)<\/samp>/i,
      );
      if (!nameMatch) continue;

      // Use stripCodeTags-style cleaning: strip tags without inserting spaces, remove zero-width chars
      const name = nameMatch[1]
        .replace(/\s*<wbr\s*\/?>\s*/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\u200b/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();

      if (!name) continue;

      // Type: td with data-title="Type"
      const typeMatch = rowHtml.match(
        /data-title="Type"[^>]*>([\s\S]*?)<\/td>/i,
      );
      if (!typeMatch) continue;

      const type = stripHtmlTags(typeMatch[1])
        .replace(/\u200b/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!type) continue;

      // Description: td with data-title="Description" (optional)
      const descMatch = rowHtml.match(
        /data-title="Description"[^>]*>([\s\S]*?)<\/td>/i,
      );
      const description = descMatch
        ? stripHtmlTags(descMatch[1])
            .replace(/\u200b/g, '')
            .replace(/\s+/g, ' ')
            .trim() || undefined
        : undefined;

      properties.push(
        new ApexProperty({
          name,
          type,
          isStatic: false,
          visibility: 'global',
          description,
        }),
      );
      yield* Console.log(`    Property: ${type} ${name}`);
    }

    yield* Console.log(
      `Extracted ${properties.length} properties from ${className}`,
    );
    return properties;
  });

/**
 * Extract properties from the single-page inline nested topic structure.
 *
 * Some Salesforce doc pages (e.g. CommercePayments AuditParamsRequest, CaptureRequest,
 * ReferencedRefundRequest) embed all member sections in one HTML document using
 * anchor-fragment seealso links rather than separate pages. Each property appears in a
 * <div class="topic reference nested2"> section:
 *
 *   <h3 class="helpHead3">propName</h3>
 *   ...
 *   <h4 class="helpHead4">Property Value</h4>
 *   <p class="p">Type: <a ...>TypeName</a></p>
 */
export const extractPropertiesFromInlineNestedHtml = (
  html: string,
  className: string,
) =>
  Effect.gen(function* () {
    yield* Console.log(`Parsing inline nested properties for: ${className}`);
    const properties: ApexProperty[] = [];

    // Split on nested2 topic divs — each is one member (property or constructor)
    const sections = html.split('<div class="topic reference nested2"');
    for (const section of sections.slice(1)) {
      // h3 content may be plain text or wrapped in <span class="titlecodeph">
      const h3Match = section.match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
      if (!h3Match) continue;
      const name = stripHtmlTags(h3Match[1]).trim();
      // Skip constructor sections (their h3 names contain '(')
      if (!name || name.includes('(')) continue;

      const propValueMatch = section.match(
        /<h4[^>]*>Property Value<\/h4>[\s\S]*?Type:\s*<a[^>]*>([^<]+)<\/a>/i,
      );
      if (!propValueMatch) continue;
      const type = stripHtmlTags(propValueMatch[1]).trim();
      if (!type) continue;

      properties.push(
        new ApexProperty({ name, type, isStatic: false, visibility: 'global' }),
      );
      yield* Console.log(`    Property (inline nested): ${type} ${name}`);
    }

    yield* Console.log(
      `Extracted ${properties.length} inline nested properties from ${className}`,
    );
    return properties;
  });

/**
 * Extract constructors from the single-page inline nested topic structure.
 *
 * Each constructor is in a <div class="topic reference nested2"> section. The constructor
 * name (without visibility prefix) is in <h3>, and parameter names/types come from the
 * <h4>Parameters</h4> DL. A <h4>Signature</h4> may or may not be present (AuditParamsRequest
 * has one; CaptureRequest and ReferencedRefundRequest do not).
 *
 *   <h3 class="helpHead3">CtorName(param1, param2)</h3>
 *   ...
 *   <h4 class="helpHead4">Parameters</h4>
 *   <dl class="dl detailList">
 *     <dt ...><var ...>paramName</var></dt>
 *     <dd ...>Type: <a ...>TypeName</a></dd>
 *   </dl>
 */
export const extractConstructorsFromInlineNestedHtml = (
  html: string,
  className: string,
) =>
  Effect.gen(function* () {
    yield* Console.log(`Parsing inline nested constructors for: ${className}`);
    const constructors: ApexConstructor[] = [];

    const sections = html.split('<div class="topic reference nested2"');
    for (const section of sections.slice(1)) {
      // h3 content may be plain text or wrapped in <span class="titlecodeph">
      const h3Match = section.match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
      if (!h3Match) continue;
      const h3Text = stripHtmlTags(h3Match[1]).trim();
      // Only process constructor sections: h3 starts with ClassName(
      if (!h3Text.startsWith(`${className}(`)) continue;

      const dlMatch = section.match(
        /<h4[^>]*>Parameters<\/h4>[\s\S]*?<dl[^>]*>([\s\S]*?)<\/dl>/i,
      );
      if (!dlMatch) continue;

      const parameters: ApexParameter[] = [];
      const dlHtml = dlMatch[1];
      // Each param: <var>name</var> followed by Type: <a>TypeName</a>
      const paramPattern =
        /<var[^>]*>([^<]+)<\/var>[\s\S]*?Type:\s*<a[^>]*>([^<]+)<\/a>/gi;
      let paramMatch;
      while ((paramMatch = paramPattern.exec(dlHtml)) !== null) {
        const paramName = stripHtmlTags(paramMatch[1]).trim();
        const paramType = stripHtmlTags(paramMatch[2]).trim();
        if (paramName && paramType) {
          parameters.push(
            new ApexParameter({ name: paramName, type: paramType }),
          );
        }
      }

      if (parameters.length > 0) {
        constructors.push(
          new ApexConstructor({ parameters, visibility: 'global' }),
        );
        yield* Console.log(
          `    Constructor (inline nested): ${className}(${parameters.map((p) => p.type).join(', ')})`,
        );
      }
    }

    yield* Console.log(
      `Extracted ${constructors.length} inline nested constructors from ${className}`,
    );
    return constructors;
  });

/**
 * Extract child page IDs from the sfdc:seealso related-links section.
 *
 * Some class pages (e.g. CommercePayments) list no members inline. Instead they
 * link to listing pages (_constructors.htm, _properties.htm, _methods.htm) which
 * in turn link to individual member detail pages. This function extracts those
 * linked page IDs so the scraper can follow them.
 */
export const extractChildPageIdsFromHtml = (html: string): string[] => {
  const seealsoStart = html.indexOf('id="sfdc:seealso"');
  if (seealsoStart < 0) return [];

  const seealsoHtml = html.slice(seealsoStart);
  const pageIds: string[] = [];

  // Links are: href="atlas.en-us.apexref.meta/apexref/apex_PAGEID.htm"
  const hrefPattern = /href="(?:[^"]*\/)?(apex_[^"/]+\.htm)"/gi;
  let match;
  while ((match = hrefPattern.exec(seealsoHtml)) !== null) {
    pageIds.push(match[1]);
  }
  return pageIds;
};

/**
 * Parse a property from a signature string of the form:
 *   `global|public|private Type name { get; set; }`
 *
 * Individual property sub-pages (e.g. PostAuthorizationRequest_amount.htm) carry
 * their signature in an <h2>Signature</h2> block rather than a property table.
 * This parser handles that format.
 */
const parsePropertyFromSignature = (signature: string): ApexProperty | null => {
  const normalized = signature.replace(/\s+/g, ' ').trim();
  // Match: visibility Type name {  (lazy type so the last word before { is the name)
  const propPattern =
    /^(public|global|private)\s+([\w.<>,\[\]\s]+?)\s+(\w+)\s*\{/;
  const match = normalized.match(propPattern);
  if (!match) return null;
  return new ApexProperty({
    name: match[3],
    type: match[2].trim(),
    isStatic: false,
    visibility: match[1],
  });
};

/**
 * Extract a single property from an individual property sub-page.
 *
 * These pages use <h2>Signature</h2> (handled by the updated extractSignatures)
 * with a property accessor signature: `global Type name { get; set; }`.
 */
export const extractPropertyFromSubPageHtml = (
  html: string,
  className: string,
) =>
  Effect.gen(function* () {
    yield* Console.log(`Parsing property sub-page for: ${className}`);
    const signatures = extractSignatures(html);
    for (const sig of signatures) {
      const prop = parsePropertyFromSignature(sig);
      if (prop) {
        yield* Console.log(`    Property: ${prop.type} ${prop.name}`);
        return prop as ApexProperty | null;
      }
    }
    return null as ApexProperty | null;
  });

/**
 * Extract all enums from an aggregate enum page (e.g. connectAPI_enums.htm).
 *
 * Enum names come from the `id` attribute of <samp class="codeph apex_code" id="EnumName">
 * elements. Enum values come from <ul id="EnumNameEnum"> lists containing
 * <samp class="codeph nolang"> items.
 */
export const extractMultipleEnumsFromHtml = (html: string, namespace: string) =>
  Effect.gen(function* () {
    yield* Console.log(
      `Parsing aggregate enum page for namespace: ${namespace}`,
    );

    const result: Array<{ name: string; values: string[] }> = [];

    // Enum names are in <samp class="codeph apex_code" id="EnumName"> elements inside a <tr>.
    // Values are in the sibling <td> of the same row, regardless of the UL's id attribute.
    // Strategy: find the <tr> containing each enum's <samp id="...">, extract values from
    // everything after the first </td> in that row — avoids fragile UL id pattern matching.
    const namePattern =
      /<samp[^>]*class="codeph apex_code"[^>]*\bid="([A-Za-z][A-Za-z0-9_]*)"[^>]*>/gi;
    let match;

    while ((match = namePattern.exec(html)) !== null) {
      // Strip zero-width spaces and capitalize first character
      const raw = match[1].replace(/\u200b/g, '');
      const name = raw.length > 0 ? raw[0].toUpperCase() + raw.slice(1) : raw;

      // Walk back to find the start of the enclosing <tr>
      const matchPos = match.index;
      const trStart = html.lastIndexOf('<tr', matchPos);
      const trEnd = html.indexOf('</tr>', matchPos);
      const rowHtml =
        trStart >= 0 && trEnd > 0 ? html.slice(trStart, trEnd + 5) : '';

      // Values are in the second <td> of the row — skip the first </td>
      const firstTdEnd = rowHtml.indexOf('</td>');
      const valueTdHtml = firstTdEnd >= 0 ? rowHtml.slice(firstTdEnd) : rowHtml;

      const values: string[] = [];
      if (valueTdHtml) {
        const valuePattern =
          /<samp class="codeph (?:nolang|apex_code)">([A-Za-z][A-Za-z0-9_]*)<\/samp>/g;
        let vm;
        while ((vm = valuePattern.exec(valueTdHtml)) !== null) {
          values.push(vm[1]);
        }
      }

      result.push({ name, values });
    }

    yield* Console.log(`  Found ${result.length} enums in aggregate page`);
    return result;
  });
