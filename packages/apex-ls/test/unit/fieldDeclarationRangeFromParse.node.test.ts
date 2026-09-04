/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Unit tests for {@link fieldDeclarationRangeFromParse} (W-23631087 re-review,
 * P2). The helper resolves a field/property's declaration identifier range from
 * a STANDALONE parse of the declaring file. When multiple same-named fields
 * exist across nested/sibling types in one file, it must disambiguate by the
 * OWNING TYPE FQN (walking the parent chain past the generated class-body block
 * to the enclosing type), NOT by the immediate type leaf name — two types in
 * different branches can share a leaf (`A.Dup` vs `B.Dup`). Genuine ambiguity
 * fails closed to null so the caller declines rather than rename the wrong
 * declaration.
 *
 * These run against a real parse (no mocks) so they stay honest about the
 * symbol shape the production standalone parse actually produces.
 */
import {
  CompilerService,
  SymbolTable,
  FullSymbolCollectorListener,
} from '@salesforce/apex-lsp-parser-ast';
import {
  fieldDeclarationRangeFromParse,
  fieldRenameDeclarationDecision,
} from '../../src/worker.platform.shared';

/** Parse `src` the same way resolveFieldRename parses the declaring file. */
const parse = (src: string): SymbolTable => {
  const table = new SymbolTable();
  const compiled = new CompilerService().compile(
    src,
    'F.cls',
    new FullSymbolCollectorListener(table),
    { collectReferences: true, resolveReferences: true },
  );
  return compiled?.result instanceof SymbolTable ? compiled.result : table;
};

describe('fieldDeclarationRangeFromParse', () => {
  it('returns the single field range when the name is unique', () => {
    const table = parse(`public class Solo {
    public Integer amount;
}`);
    const range = fieldDeclarationRangeFromParse(
      table as never,
      'amount',
      'Solo',
    );
    expect(range).not.toBeNull();
    // `amount` is on parser line 2 (1-based).
    expect(range!.startLine).toBe(2);
  });

  it('returns null when the field name is not present', () => {
    const table = parse(`public class Solo {
    public Integer amount;
}`);
    expect(
      fieldDeclarationRangeFromParse(table as never, 'missing', 'Solo'),
    ).toBeNull();
  });

  it('disambiguates same-named fields across DIFFERENT-leaf nested types', () => {
    const table = parse(`public class Outer {
    public Integer amount;
    public class Inner {
        public Integer amount;
    }
}`);
    const outer = fieldDeclarationRangeFromParse(
      table as never,
      'amount',
      'Outer',
    );
    const inner = fieldDeclarationRangeFromParse(
      table as never,
      'amount',
      'Outer.Inner',
    );
    expect(outer).not.toBeNull();
    expect(inner).not.toBeNull();
    // Outer.amount on line 2, Outer.Inner.amount on line 4 — distinct ranges.
    expect(outer!.startLine).toBe(2);
    expect(inner!.startLine).toBe(4);
  });

  it('disambiguates SAME-leaf nested types in different branches by owning FQN', () => {
    // Both `Wrapper.Leaf` and `Other.Leaf` share the leaf `Leaf` and field
    // `total`; a leaf-only match would return the FIRST `Leaf` for both.
    const table = parse(`public class Root {
    public class Wrapper {
        public class Leaf {
            public Integer total;
        }
    }
    public class Other {
        public class Leaf {
            public Integer total;
        }
    }
}`);
    const wrapper = fieldDeclarationRangeFromParse(
      table as never,
      'total',
      'Root.Wrapper.Leaf',
    );
    const other = fieldDeclarationRangeFromParse(
      table as never,
      'total',
      'Root.Other.Leaf',
    );
    expect(wrapper).not.toBeNull();
    expect(other).not.toBeNull();
    // Wrapper.Leaf.total on line 4, Other.Leaf.total on line 9 — the owning-FQN
    // walk keeps them distinct where a leaf-only match would collapse both.
    expect(wrapper!.startLine).toBe(4);
    expect(other!.startLine).toBe(9);
    expect(wrapper!.startLine).not.toBe(other!.startLine);
  });

  it('tolerates a namespace-qualified requested FQN (suffix match)', () => {
    const table = parse(`public class Outer {
    public Integer amount;
    public class Inner {
        public Integer amount;
    }
}`);
    // The graph FQN may carry a namespace the standalone parse cannot see.
    const inner = fieldDeclarationRangeFromParse(
      table as never,
      'amount',
      'MyNamespace.Outer.Inner',
    );
    expect(inner).not.toBeNull();
    expect(inner!.startLine).toBe(4);
  });

  it('fails closed (null) when the requested FQN is too ambiguous to disambiguate', () => {
    // A bare leaf `Leaf` matches BOTH same-leaf types → no unique match → null,
    // so the caller declines rather than rename the wrong declaration.
    const table = parse(`public class Root {
    public class Wrapper {
        public class Leaf {
            public Integer total;
        }
    }
    public class Other {
        public class Leaf {
            public Integer total;
        }
    }
}`);
    expect(
      fieldDeclarationRangeFromParse(table as never, 'total', 'Leaf'),
    ).toBeNull();
  });
});

/**
 * W-23631087 re-review (P1): a field rename must never emit a usage-only
 * WorkspaceEdit. When the declaration cannot be located but usages WERE found,
 * the rename must decline (fail closed) rather than rewrite the usages and leave
 * the declaration dangling.
 */
describe('fieldRenameDeclarationDecision', () => {
  it('proceeds when the declaration resolved (regardless of usage count)', () => {
    expect(fieldRenameDeclarationDecision(true, 0)).toBe('proceed');
    expect(fieldRenameDeclarationDecision(true, 5)).toBe('proceed');
  });

  it('reports nothing-to-rename when there is no declaration AND no usage', () => {
    expect(fieldRenameDeclarationDecision(false, 0)).toBe('nothing-to-rename');
  });

  it('DECLINES a partial edit when usages exist but the declaration is missing', () => {
    // The core regression: old code returned the usage-only edit here.
    expect(fieldRenameDeclarationDecision(false, 1)).toBe('decline-partial');
    expect(fieldRenameDeclarationDecision(false, 42)).toBe('decline-partial');
  });
});
