import { Effect, Console } from "effect";
import { ApexMethod, ApexParameter, ApexEnumValue } from "../types/apex";

export class HtmlParsingError {
  readonly _tag = "HtmlParsingError";
  constructor(readonly message: string, readonly cause?: unknown) {}
}

/**
 * Strip HTML tags and decode HTML entities to get clean text content
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

const extractSignatures = (html: string): string[] => {
  const signatures: string[] = [];
  const signaturePattern = /<h4[^>]*>Signature<\/h4>\s*<p[^>]*><samp[^>]*apex_code[^>]*>([\s\S]*?)<\/samp><\/p>/gi;

  let match;
  while ((match = signaturePattern.exec(html)) !== null) {
    signatures.push(stripHtmlTags(match[1]));
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

  const isStatic = !!match[2];
  const returnType = match[3].trim();
  const methodName = match[4];
  const paramsStr = match[5].trim();

  const parameters: ApexParameter[] = [];
  if (paramsStr) {
    for (const paramPart of paramsStr.split(',')) {
      const trimmed = paramPart.trim();
      if (!trimmed) continue;

      const paramMatch = trimmed.match(/^([A-Za-z0-9_.<>,\[\]\s]+)\s+([a-zA-Z_][a-zA-Z0-9_]*)$/);
      if (paramMatch) {
        parameters.push(new ApexParameter({ type: paramMatch[1].trim(), name: paramMatch[2].trim() }));
      }
    }
  }

  return new ApexMethod({ name: methodName, returnType, parameters, isStatic, signature: normalizedSignature });
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

/**
 * Extract multiple exception class names from an aggregated exceptions page
 */
export const extractExceptionClassNamesFromHtml = (html: string, namespace: string) =>
  Effect.gen(function* () {
    yield* Console.log(`Parsing exception classes for namespace: ${namespace}`);

    const classNames: string[] = [];
    const seen = new Set<string>();

    const headingPattern = /<h[23][^>]*>\s*<a[^>]*>\s*([A-Za-z][A-Za-z0-9]*Exception[A-Za-z0-9]*)\s*<\/a>\s*<\/h[23]>/gi;
    let match;

    while ((match = headingPattern.exec(html)) !== null) {
      const name = match[1].trim();
      if (name && !seen.has(name)) {
        seen.add(name);
        classNames.push(name);
      }
    }

    if (classNames.length === 0) {
      const apinamePattern = /<span[^>]*class="[^"]*apiname[^"]*"[^>]*>([A-Za-z][A-Za-z0-9]*Exception[A-Za-z0-9]*)<\/span>/gi;
      while ((match = apinamePattern.exec(html)) !== null) {
        const name = match[1].trim();
        if (name && !seen.has(name)) {
          seen.add(name);
          classNames.push(name);
        }
      }
    }

    yield* Console.log(`  Found ${classNames.length} exception classes`);
    return classNames;
  });
