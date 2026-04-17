import type { NamespaceInfo } from './toc-parser';

export interface NamespaceCounts {
  /** Total entries (classes + interfaces + enums + exceptions pages) from TOC */
  total: number;
  classes: number;
  interfaces: number;
  enums: number;
  /** Exceptions pages — each may expand to multiple classes at generation time */
  exceptionPages: number;
}

export type NamespaceCountMap = Map<string, NamespaceCounts>;

/**
 * Build a map of namespace → expected entry counts from parsed TOC data.
 * These counts reflect what the TOC documents, not what was generated.
 */
export const extractNamespaceCounts = (
  namespaces: NamespaceInfo[],
): NamespaceCountMap => {
  const result: NamespaceCountMap = new Map();

  for (const ns of namespaces) {
    let classes = 0;
    let interfaces = 0;
    let enums = 0;
    let exceptionPages = 0;

    for (const entry of ns.classes) {
      switch (entry.pageType) {
        case 'class':
          classes++;
          break;
        case 'interface':
          interfaces++;
          break;
        case 'enum':
          enums++;
          break;
        case 'exceptions':
          exceptionPages++;
          break;
      }
    }

    result.set(ns.name, {
      total: ns.classes.length,
      classes,
      interfaces,
      enums,
      exceptionPages,
    });
  }

  return result;
};
