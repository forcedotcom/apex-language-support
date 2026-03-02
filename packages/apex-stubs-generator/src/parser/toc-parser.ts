import { Effect, Console } from "effect";

export class TocParsingError {
  readonly _tag = "TocParsingError";
  constructor(readonly message: string, readonly cause?: unknown) {}
}

export type PageType = "class" | "enum" | "interface" | "exceptions";

export interface ClassReference {
  name: string;
  pageId: string;
  namespace: string;
  pageType: PageType;
}

export interface NamespaceInfo {
  name: string;
  pageId: string;
  classes: ClassReference[];
}

const classifyPageType = (href: string, text: string): PageType => {
  const lowerHref = href.toLowerCase();
  const lowerText = text.toLowerCase().trim();

  if (lowerHref.includes("_enum_") || lowerHref.includes("_enums") || lowerText.endsWith(" enum")) {
    return "enum";
  }
  if (lowerHref.includes("_interface_") || lowerText.endsWith(" interface")) {
    return "interface";
  }
  if (lowerHref.includes("_exception") || lowerText.endsWith(" exceptions") || lowerText.endsWith(" exception")) {
    return "exceptions";
  }
  return "class";
};

const cleanName = (text: string, pageType: PageType): string => {
  let name = text.trim();
  name = name.replace(/\s+Class\s*$/i, "");
  name = name.replace(/\s+Interface\s*$/i, "");
  name = name.replace(/\s+Enum\s*$/i, "");
  name = name.replace(/\s+Exceptions?\s*$/i, "");
  if (pageType === "exceptions") {
    name = name.trim() || "Exceptions";
  }
  return name.trim();
};

/**
 * Parse the TOC JSON structure to extract all namespace and class references
 */
export const parseTocStructure = (tocJson: any) =>
  Effect.gen(function* () {
    yield* Console.log("Parsing TOC structure...");

    const namespaces: NamespaceInfo[] = [];

    if (!tocJson.toc || !Array.isArray(tocJson.toc) || tocJson.toc.length === 0) {
      return yield* Effect.fail(
        new TocParsingError("Invalid TOC structure: missing or empty toc array")
      );
    }

    const root = tocJson.toc[0];
    if (!root.children || !Array.isArray(root.children)) {
      return yield* Effect.fail(
        new TocParsingError("Invalid TOC structure: root has no children")
      );
    }

    for (const nsNode of root.children) {
      const nsText = nsNode.text || nsNode.title || "";
      const nsHref = nsNode.a_attr?.href || "";

      if (!nsText || !nsHref) {
        continue;
      }

      // Only process real namespace nodes — their hrefs match apex_namespace_* or
      // the ConnectApi-specific pattern. This filters out documentation sections
      // like "Release Notes", "Apex DML Operations", "Appendices", etc.
      const isNamespace =
        nsHref.includes("apex_namespace_") ||
        nsHref.includes("apex_classes_connect_api");
      if (!isNamespace) {
        continue;
      }

      // Strip all "Namespace" suffixes (e.g. "Wave Namespace Namespace" → "Wave")
      const nsName = nsText.replace(/(\s+Namespace)+\s*$/i, "").trim();
      const classes: ClassReference[] = [];

      if (nsNode.children && Array.isArray(nsNode.children)) {
        for (const classNode of nsNode.children) {
          const classText = classNode.text || classNode.title || "";
          const classHref = classNode.a_attr?.href || "";

          if (!classText || !classHref) {
            continue;
          }

          const pageId = classHref.split("#")[0].trim();
          if (!pageId || !pageId.endsWith(".htm")) {
            continue;
          }

          const pageType = classifyPageType(pageId, classText);
          const className = cleanName(classText, pageType);

          classes.push({ name: className, pageId, namespace: nsName, pageType });
        }
      }

      if (classes.length > 0) {
        namespaces.push({ name: nsName, pageId: nsHref.split("#")[0], classes });
      }
    }

    yield* Console.log(`Found ${namespaces.length} namespaces with classes`);

    let totalClasses = 0;
    for (const ns of namespaces) {
      totalClasses += ns.classes.length;
    }
    yield* Console.log(`Total entries: ${totalClasses}`);

    return namespaces;
  });
