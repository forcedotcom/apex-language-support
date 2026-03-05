import { Effect, Console } from "effect";
import { ApexConstructor, ApexMethod, ApexParameter, ApexEnumValue } from "../types/apex";

export class HtmlParsingError {
  readonly _tag = "HtmlParsingError";
  constructor(readonly message: string, readonly cause?: unknown) {}
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
  // Match any <samp class="codeph..."> after a Signature heading.
  const signaturePattern = /<h4[^>]*>Signature<\/h4>\s*<p[^>]*><samp[^>]*codeph[^>]*>([\s\S]*?)<\/samp><\/p>/gi;

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

  const methodPattern = /^(public|global|private)\s+(static\s+)?([A-Za-z0-9_.<>,\[\]\s]+?)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)$/;
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
  if (returnTypeParts.length > 1 && /^[a-z]/.test(lastReturnPart) && /^[A-Z]/.test(methodName)) {
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

      const paramMatch = trimmed.match(/^([A-Za-z0-9_.<>,\[\]\s]+)\s+([a-zA-Z_][a-zA-Z0-9_]*)$/);
      if (paramMatch) {
        parameters.push(new ApexParameter({ type: paramMatch[1].trim(), name: paramMatch[2].trim() }));
      }
    }
  }

  return new ApexMethod({ name: methodName, returnType, parameters, isStatic, visibility, signature: normalizedSignature });
};

const extractClassDescription = (html: string): string | undefined => {
  const descPattern = /<div class="shortdesc">([\s\S]*?)<\/div>/i;
  const match = html.match(descPattern);
  return match ? stripHtmlTags(match[1]) : undefined;
};

const extractMethodDescription = (html: string, methodName: string): string | undefined => {
  const methodSectionPattern = new RegExp(
    `<h3[^>]*>${methodName}[^<]*</h3>[\\s\\S]*?<div class="shortdesc">([\\s\\S]*?)</div>`,
    'i'
  );
  const match = html.match(methodSectionPattern);
  return match ? stripHtmlTags(match[1]) : undefined;
};

const extractParameterDescriptions = (html: string, methodName: string): Map<string, string> => {
  const paramDescriptions = new Map<string, string>();

  const methodSectionPattern = new RegExp(
    `<h3[^>]*>${methodName}[^<]*</h3>([\\s\\S]*?)(?=<h[23]|<div class="topic"|$)`,
    'i'
  );
  const sectionMatch = html.match(methodSectionPattern);
  if (!sectionMatch) return paramDescriptions;

  const paramsPattern = /<h4[^>]*>Parameters<\/h4>[\s\S]*?<dl class="dl detailList">([\s\S]*?)<\/dl>/i;
  const paramsMatch = sectionMatch[1].match(paramsPattern);
  if (!paramsMatch) return paramDescriptions;

  const paramItemPattern = /<dt[^>]*><var[^>]*>([^<]+)<\/var><\/dt>[\s\S]*?<dd[^>]*>Type:[\s\S]*?<\/dd>\s*(?:<dd[^>]*>([\s\S]*?)<\/dd>)?/gi;

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
        const paramDescriptions = extractParameterDescriptions(html, method.name);

        const updatedParameters = method.parameters.map(param =>
          new ApexParameter({ type: param.type, name: param.name, description: paramDescriptions.get(param.name) })
        );

        methods.push(new ApexMethod({
          name: method.name,
          returnType: method.returnType,
          parameters: updatedParameters,
          isStatic: method.isStatic,
          visibility: method.visibility,
          signature: method.signature,
          description,
        }));

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
const parseConstructorSignature = (signature: string, className: string): ApexConstructor | null => {
  const normalized = signature.replace(/\s+/g, ' ').trim();
  const ctorPattern = /^(public|global|private)\s+([A-Za-z][A-Za-z0-9_]*)\s*\(([^)]*)\)$/;
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
    const paramMatch = trimmed.match(/^([A-Za-z0-9_.<>,\[\]\s]+)\s+([a-zA-Z_][a-zA-Z0-9_]*)$/);
    if (paramMatch) {
      parameters.push(new ApexParameter({ type: paramMatch[1].trim(), name: paramMatch[2].trim() }));
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
        yield* Console.log(`    Parsed constructor: ${className}(${ctor.parameters.map(p => p.type).join(', ')})`);
      }
    }

    yield* Console.log(`Extracted ${constructors.length} constructors from ${className}`);
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
export const extractExceptionClassNamesFromHtml = (html: string, namespace: string) =>
  Effect.gen(function* () {
    yield* Console.log(`Parsing exception classes for namespace: ${namespace}`);

    const results: ExtractedExceptionClass[] = [];
    const seen = new Set<string>();

    const addName = (raw: string) => {
      const cleaned = raw.replace(/\u200b/g, "").trim();
      const dotIdx = cleaned.lastIndexOf(".");
      const name = dotIdx >= 0 ? cleaned.slice(dotIdx + 1).trim() : cleaned;
      const parentClass = dotIdx >= 0 ? cleaned.slice(0, dotIdx).trim() : undefined;
      if (name && !seen.has(name)) {
        seen.add(name);
        results.push({ name, parentClass });
      }
    };

    let match;

    // Format 1: heading with anchor
    const headingPattern = /<h[23][^>]*>\s*<a[^>]*>\s*([A-Za-z][A-Za-z0-9]*Exception[A-Za-z0-9]*)\s*<\/a>\s*<\/h[23]>/gi;
    while ((match = headingPattern.exec(html)) !== null) addName(match[1]);

    // Format 2: <span class="apiname">
    if (results.length === 0) {
      const apinamePattern = /<span[^>]*class="[^"]*apiname[^"]*"[^>]*>([A-Za-z][A-Za-z0-9]*Exception[A-Za-z0-9]*)<\/span>/gi;
      while ((match = apinamePattern.exec(html)) !== null) addName(match[1]);
    }

    // Format 3: <samp class="codeph apex_code">[Parent.]ClassName</samp> in table cells
    if (results.length === 0) {
      const sampPattern = /<samp[^>]*class="codeph apex_code"[^>]*>([A-Za-z][A-Za-z0-9.​\u200b]*Exception[A-Za-z0-9]*)<\/samp>/gi;
      while ((match = sampPattern.exec(html)) !== null) addName(match[1]);
    }

    yield* Console.log(`  Found ${results.length} exception classes`);
    return results;
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
    yield* Console.log(`Parsing aggregate enum page for namespace: ${namespace}`);

    const result: Array<{ name: string; values: string[] }> = [];

    // Enum names are in <samp class="codeph apex_code" id="EnumName"> elements inside a <tr>.
    // Values are in the sibling <td> of the same row, regardless of the UL's id attribute.
    // Strategy: find the <tr> containing each enum's <samp id="...">, extract values from
    // everything after the first </td> in that row — avoids fragile UL id pattern matching.
    const namePattern = /<samp[^>]*class="codeph apex_code"[^>]*\bid="([A-Za-z][A-Za-z0-9_]*)"[^>]*>/gi;
    let match;

    while ((match = namePattern.exec(html)) !== null) {
      // Strip zero-width spaces and capitalize first character
      const raw = match[1].replace(/\u200b/g, "");
      const name = raw.length > 0 ? raw[0].toUpperCase() + raw.slice(1) : raw;

      // Walk back to find the start of the enclosing <tr>
      const matchPos = match.index;
      const trStart = html.lastIndexOf("<tr", matchPos);
      const trEnd = html.indexOf("</tr>", matchPos);
      const rowHtml = trStart >= 0 && trEnd > 0 ? html.slice(trStart, trEnd + 5) : "";

      // Values are in the second <td> of the row — skip the first </td>
      const firstTdEnd = rowHtml.indexOf("</td>");
      const valueTdHtml = firstTdEnd >= 0 ? rowHtml.slice(firstTdEnd) : rowHtml;

      const values: string[] = [];
      if (valueTdHtml) {
        const valuePattern = /<samp class="codeph (?:nolang|apex_code)">([A-Za-z][A-Za-z0-9_]*)<\/samp>/g;
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
