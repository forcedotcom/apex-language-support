/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  CompilerService,
  ApexBreakpointListener,
  isClassSymbol,
  isTriggerSymbol,
  type ApexSymbol,
  type TypeSymbol,
} from '@salesforce/apex-lsp-parser-ast';
import type {
  ExceptionBreakpointInfo,
  LineBreakpointInfo,
} from '@salesforce/apex-lsp-shared';

const SYSTEM_EXCEPTION_TYPEREF_PREFIX = 'com/salesforce/api/exception/';

type DebuggerSymbolLookup = {
  findSymbolsInFile(uri: string): Promise<ApexSymbol[]>;
};

const typeRef = (
  symbol: TypeSymbol,
  allTypes: readonly TypeSymbol[],
  namespace?: string,
): string => {
  const names = [symbol.name];
  let parentId = symbol.parentId;
  while (parentId) {
    const parent = allTypes.find((candidate) => candidate.id === parentId);
    if (!parent) break;
    names.unshift(parent.name);
    parentId = parent.parentId;
  }
  // Public-api compilation can omit an inner type's parentId. Symbol ranges
  // remain parser-owned state, so recover the containing declaration from them.
  if (names.length === 1) {
    let child = symbol;
    while (true) {
      const parent = allTypes
        .filter(
          (candidate) =>
            candidate.id !== child.id &&
            candidate.location.symbolRange.startLine <=
              child.location.symbolRange.startLine &&
            candidate.location.symbolRange.endLine >=
              child.location.symbolRange.endLine,
        )
        .sort(
          (left, right) =>
            left.location.symbolRange.endLine -
            left.location.symbolRange.startLine -
            (right.location.symbolRange.endLine -
              right.location.symbolRange.startLine),
        )[0];
      if (!parent) break;
      names.unshift(parent.name);
      child = parent;
    }
  }
  const name = names.join('$');
  // The debugger consumes legacy bytecode identities, whose namespace segment
  // is slash-qualified even though Apex semantic names use dots.
  const qualifiedName = namespace ? `${namespace}/${name}` : name;
  const belongsToTrigger = allTypes.some(
    (candidate) =>
      isTriggerSymbol(candidate) &&
      candidate.location.symbolRange.startLine <=
        symbol.location.symbolRange.startLine &&
      candidate.location.symbolRange.endLine >=
        symbol.location.symbolRange.endLine,
  );
  return belongsToTrigger ? `__sfdc_trigger/${qualifiedName}` : qualifiedName;
};

export class DebuggerMetadataService {
  constructor(
    private readonly symbolManager: DebuggerSymbolLookup,
    private readonly getStandardNamespaces: () => ReadonlyMap<
      string,
      readonly string[]
    > = () => new Map(),
  ) {}

  async lineBreakpoints(
    uri: string,
    content: string,
    namespace?: string,
  ): Promise<LineBreakpointInfo[]> {
    const symbols = await this.symbolManager.findSymbolsInFile(uri);
    const types = symbols.filter(
      (symbol): symbol is TypeSymbol =>
        isClassSymbol(symbol) || isTriggerSymbol(symbol),
    );
    const listener = new ApexBreakpointListener();
    new CompilerService().compile(content, uri, listener, {
      includeComments: false,
    });
    const lines = listener.getResult();

    return types
      .map((type) => ({
        uri,
        typeref: typeRef(type, types, namespace),
        lines: lines.filter(
          (line) =>
            line >= type.location.symbolRange.startLine &&
            line <= type.location.symbolRange.endLine &&
            !types.some(
              (nested) =>
                nested.id !== type.id &&
                nested.location.symbolRange.startLine <= line &&
                nested.location.symbolRange.endLine >= line &&
                nested.location.symbolRange.startLine >=
                  type.location.symbolRange.startLine &&
                nested.location.symbolRange.endLine <=
                  type.location.symbolRange.endLine,
            ),
        ),
      }))
      .filter((result) => result.lines.length > 0)
      .sort((left, right) => left.typeref.localeCompare(right.typeref));
  }

  async exceptionBreakpoints(
    uri: string,
    namespace?: string,
  ): Promise<ExceptionBreakpointInfo[]> {
    const symbols = await this.symbolManager.findSymbolsInFile(uri);
    const types = symbols.filter(
      (symbol): symbol is TypeSymbol =>
        isClassSymbol(symbol) || isTriggerSymbol(symbol),
    );
    const classes = types.filter((symbol): symbol is TypeSymbol =>
      isClassSymbol(symbol),
    );
    const typesByName = new Map(
      classes.map((type) => [type.name.toLowerCase(), type]),
    );
    const extendsException = (type: TypeSymbol): boolean => {
      const seen = new Set<string>();
      let superClass = type.superClass;
      while (superClass) {
        const normalized = superClass.toLowerCase();
        if (normalized === 'exception') return true;
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        superClass = typesByName.get(normalized)?.superClass;
      }
      return false;
    };
    const userExceptions = classes.filter(extendsException).map((type) => ({
      uri,
      typeref: typeRef(type, types, namespace),
      label: type.name,
    }));
    const standardNamespaces = this.getStandardNamespaces();
    const systemClasses =
      [...standardNamespaces.entries()].find(
        ([namespace]) => namespace.toLowerCase() === 'system',
      )?.[1] ?? [];
    const systemExceptions = [...systemClasses]
      .map((fileName) => fileName.replace(/\.cls$/i, ''))
      .filter((name) => name.endsWith('Exception'))
      .map((name) => ({
        uri: null,
        typeref: `${SYSTEM_EXCEPTION_TYPEREF_PREFIX}${name}`,
        label: `System.${name}`,
      }));
    return [...userExceptions, ...systemExceptions].sort((left, right) =>
      left.label.localeCompare(right.label),
    );
  }
}
