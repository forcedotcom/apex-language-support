import { Effect, Console } from 'effect';

export class TocParsingError {
  readonly _tag = 'TocParsingError';
  constructor(
    readonly message: string,
    readonly cause?: unknown,
  ) {}
}

export type PageType = 'class' | 'enum' | 'interface' | 'exceptions';

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

  if (
    lowerHref.includes('_enum_') ||
    lowerHref.includes('_enums') ||
    lowerText.endsWith(' enum')
  ) {
    return 'enum';
  }
  if (lowerHref.includes('_interface_') || lowerText.endsWith(' interface')) {
    return 'interface';
  }
  if (
    lowerHref.includes('_exception') ||
    lowerText.endsWith(' exceptions') ||
    lowerText.endsWith(' exception')
  ) {
    return 'exceptions';
  }
  return 'class';
};

const cleanName = (text: string, pageType: PageType): string => {
  let name = text.trim();
  // Strip Unicode zero-width spaces (U+200B) used as line-break hints in long names
  name = name.replace(/\u200b/g, '');
  // Strip the "ConnectApi." prefix that appears in input/output class names
  name = name.replace(/^ConnectApi\./i, '');
  // Strip common type/visibility suffixes found in TOC labels
  name = name.replace(/\s+Class(?:es)?\s*$/i, '');
  name = name.replace(/\s+Interface\s*$/i, '');
  name = name.replace(/\s+Enum\s*$/i, '');
  name = name.replace(/\s+Exceptions?\s*$/i, '');
  // Strip Apex visibility modifiers that sometimes appear in TOC labels
  // (e.g. "OpportunityTerritory2AssignmentFilter Global Interface")
  name = name.replace(/\s+(?:global|public|private|protected)\s*$/i, '');
  if (pageType === 'exceptions') {
    name = name.trim() || 'Exceptions';
  }
  name = name.trim();
  // Inner classes in the TOC appear as "OuterClass.InnerClass" — use only the inner class name.
  if (name.includes('.')) {
    name = name.slice(name.lastIndexOf('.') + 1).trim();
  }
  // Apex type names always start with an uppercase letter.
  return name.length > 0 ? name[0].toUpperCase() + name.slice(1) : name;
};

/**
 * Returns true if a TOC node is a category that groups multiple individual class pages
 * rather than being a single class page with method/property sub-sections.
 *
 * Rules:
 * - If the node's own href already identifies it as a specific class/interface page
 *   (apex_class_* or apex_interface_*), its children are property/method sections → not a category.
 * - If any child href ends with _methods.htm or _constructors.htm or _properties.htm,
 *   the children are method-section sub-pages of the same class → not a category.
 * - Otherwise, if children point to multiple different .htm files → it IS a category.
 */
const isCategoryNode = (node: any): boolean => {
  const ownHref = (node.a_attr?.href || '').split('#')[0].toLowerCase();

  // Parent is already an individual class/interface page → children are sections, not classes.
  if (ownHref.includes('apex_class_') || ownHref.includes('apex_interface_'))
    return false;

  const children: any[] = node.children || [];
  if (children.length === 0) return false;

  const childHrefs = children
    .map((c: any) => (c.a_attr?.href || '').split('#')[0].toLowerCase().trim())
    .filter((h: string) => h.endsWith('.htm'));

  // Children are named method/constructor section pages (e.g. apex_System_PageReference_methods.htm) → not a category.
  if (childHrefs.some((h) => /_methods\.htm$|_constructors?\.htm$/.test(h)))
    return false;

  // If children point to multiple distinct .htm files → this is a category to recurse into.
  return new Set(childHrefs).size > 1;
};

/**
 * Pages that are documentation-only and should never be treated as Apex types.
 */
const isDocumentationPage = (href: string, text: string): boolean => {
  const lower = href.toLowerCase();
  return (
    lower.includes('release_notes') ||
    lower.includes('releasenotes') ||
    text.toLowerCase().includes('release notes')
  );
};

/**
 * Process a single TOC leaf node into zero or more ClassReferences.
 * If the node is a category (children pointing to different pages), recurse into children.
 */
const processClassNode = (node: any, nsName: string): ClassReference[] => {
  const text = node.text || node.title || '';
  const href = node.a_attr?.href || '';

  if (!text || !href) return [];

  // Skip documentation-only pages
  if (isDocumentationPage(href, text)) return [];

  // If this node groups multiple individual class pages, recurse into its children
  if (isCategoryNode(node)) {
    const results: ClassReference[] = [];
    for (const child of node.children || []) {
      results.push(...processClassNode(child, nsName));
    }
    return results;
  }

  const pageId = href.split('#')[0].trim();
  if (!pageId || !pageId.endsWith('.htm')) return [];

  const pageType = classifyPageType(pageId, text);
  const className = cleanName(text, pageType);
  if (!className) return [];

  // A valid Apex identifier never contains spaces.
  // If the cleaned name still has spaces it's a documentation/category page (e.g.
  // "ConnectApi Utilities", "Example Implementation to ..."), not an actual Apex type.
  if (
    (pageType === 'class' || pageType === 'interface') &&
    /\s/.test(className)
  )
    return [];

  return [{ name: className, pageId, namespace: nsName, pageType }];
};

/**
 * Parse the TOC JSON structure to extract all namespace and class references
 */
export const parseTocStructure = (tocJson: any) =>
  Effect.gen(function* () {
    yield* Console.log('Parsing TOC structure...');

    const namespaces: NamespaceInfo[] = [];

    if (
      !tocJson.toc ||
      !Array.isArray(tocJson.toc) ||
      tocJson.toc.length === 0
    ) {
      return yield* Effect.fail(
        new TocParsingError(
          'Invalid TOC structure: missing or empty toc array',
        ),
      );
    }

    const root = tocJson.toc[0];
    if (!root.children || !Array.isArray(root.children)) {
      return yield* Effect.fail(
        new TocParsingError('Invalid TOC structure: root has no children'),
      );
    }

    for (const nsNode of root.children) {
      const nsText = nsNode.text || nsNode.title || '';
      const nsHref = nsNode.a_attr?.href || '';

      if (!nsText || !nsHref) continue;

      // Only process real namespace nodes — their hrefs match apex_namespace_* or
      // the ConnectApi-specific pattern. This filters out documentation sections
      // like "Release Notes", "Apex DML Operations", "Appendices", etc.
      const isNamespace =
        nsHref.includes('apex_namespace_') ||
        nsHref.includes('apex_classes_connect_api');
      if (!isNamespace) continue;

      // Strip all "Namespace" suffixes (e.g. "Wave Namespace Namespace" → "Wave")
      const nsName = nsText.replace(/(\s+Namespace)+\s*$/i, '').trim();
      const classes: ClassReference[] = [];

      for (const classNode of nsNode.children || []) {
        classes.push(...processClassNode(classNode, nsName));
      }

      // Deduplicate by pageId (some class pages appear under multiple TOC nodes)
      const seen = new Set<string>();
      const unique = classes.filter((c) => {
        const key = c.pageId;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (unique.length > 0) {
        namespaces.push({
          name: nsName,
          pageId: nsHref.split('#')[0],
          classes: unique,
        });
      }
    }

    yield* Console.log(`Found ${namespaces.length} namespaces with classes`);

    let totalEntries = 0;
    for (const ns of namespaces) totalEntries += ns.classes.length;
    yield* Console.log(`Total entries: ${totalEntries}`);

    return namespaces;
  });
