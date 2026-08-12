/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CompilerService } from '../../../src/parser/compilerService';
import { FullSymbolCollectorListener } from '../../../src/parser/listeners/FullSymbolCollectorListener';
import { SymbolTable } from '../../../src/types/symbol';
import { findFieldOccurrences } from '../../../src/symbols/ops/findFieldOccurrences';

describe('findFieldOccurrences', () => {
  function parseSource(src: string, uri: string): SymbolTable {
    const table = new SymbolTable();
    const listener = new FullSymbolCollectorListener(table);
    const compiler = new CompilerService();
    const result = compiler.compile(src, uri, listener, {
      collectReferences: true,
      resolveReferences: true,
    });
    return result?.result instanceof SymbolTable ? result.result : table;
  }

  it('finds implicit-this field usages in the declaring class', () => {
    const src = `public class Account {
    public Integer total;

    public void increment() {
        total = total + 1;
    }
}`;
    const table = parseSource(src, 'file:///test/Account.cls');

    const result = findFieldOccurrences(
      table,
      'file:///test/Account.cls',
      { name: 'total', kind: 'field' },
      'Account',
    );

    // Declaration (line 2) + 2 usages in increment() (line 5: assign LHS and RHS).
    expect(result.occurrences.length).toBeGreaterThanOrEqual(2);
    expect(result.skipped.length).toBe(0);

    // Verify all occurrences are for 'total'.
    result.occurrences.forEach((occ) => {
      expect(occ.uri).toBe('file:///test/Account.cls');
    });
  });

  it('finds qualified field access (assignment form)', () => {
    const src = `public class Caller {
    public void test() {
        Account acct = new Account();
        acct.total = 10;
    }
}`;
    const table = parseSource(src, 'file:///test/Caller.cls');

    const result = findFieldOccurrences(
      table,
      'file:///test/Caller.cls',
      { name: 'total', kind: 'field' },
      'Account',
    );

    // The assignment `acct.total = 10` should be found (receiver type = Account).
    expect(result.occurrences.length).toBeGreaterThanOrEqual(1);

    const occ = result.occurrences[0];
    expect(occ.uri).toBe('file:///test/Caller.cls');
    // Line 4 (1-based) = `acct.total = 10;`
    expect(occ.identifierRange.startLine).toBe(4);
  });

  it('finds qualified field access (read form)', () => {
    const src = `public class Caller {
    public void test() {
        Account acct = new Account();
        Integer x = acct.total;
    }
}`;
    const table = parseSource(src, 'file:///test/Caller.cls');

    const result = findFieldOccurrences(
      table,
      'file:///test/Caller.cls',
      { name: 'total', kind: 'field' },
      'Account',
    );

    // The read `= acct.total` should be found (receiver type = Account).
    expect(result.occurrences.length).toBeGreaterThanOrEqual(1);

    const occ = result.occurrences[0];
    expect(occ.uri).toBe('file:///test/Caller.cls');
    // Line 4 (1-based) = `Integer x = acct.total;`
    expect(occ.identifierRange.startLine).toBe(4);
  });

  it('skips field access with non-matching receiver type (disambiguation)', () => {
    const src = `public class Caller {
    public void test() {
        Other other = new Other();
        other.total = 99;
    }
}`;
    const table = parseSource(src, 'file:///test/Caller.cls');

    const result = findFieldOccurrences(
      table,
      'file:///test/Caller.cls',
      { name: 'total', kind: 'field' },
      'Account', // Looking for Account.total, not Other.total
    );

    // Should NOT find `other.total` (receiver type = Other ≠ Account).
    expect(result.occurrences.length).toBe(0);
    expect(result.skipped.length).toBeGreaterThanOrEqual(1);

    const skip = result.skipped[0];
    expect(skip.reason).toContain('receiver-type-mismatch');
  });

  it('skips chained field access as unresolvable or mismatched', () => {
    const src = `public class Caller {
    public void test() {
        Container a = new Container();
        a.inner.total = 5;
    }
}`;
    const table = parseSource(src, 'file:///test/Caller.cls');

    const result = findFieldOccurrences(
      table,
      'file:///test/Caller.cls',
      { name: 'total', kind: 'field' },
      'Account',
    );

    // Chained `a.inner.total`: the immediate receiver of `total` is `inner` (a field),
    // which either won't have a co-located VARIABLE_USAGE with a known type (unresolvable)
    // OR will resolve to Container instead of Account (mismatch).
    // Either way, it should be skipped for safety.
    expect(result.occurrences.length).toBe(0);
    expect(result.skipped.length).toBeGreaterThanOrEqual(1);

    const skip = result.skipped[0];
    // Accept either unresolvable or type mismatch as valid skip reasons.
    expect(
      skip.reason.includes('unresolvable-receiver') ||
        skip.reason.includes('receiver-type-mismatch'),
    ).toBe(true);
  });

  it('skips implicit-this usage in wrong enclosing type', () => {
    const src = `public class Other {
    public Integer total;

    public void use() {
        total = 99;
    }
}`;
    const table = parseSource(src, 'file:///test/Other.cls');

    const result = findFieldOccurrences(
      table,
      'file:///test/Other.cls',
      { name: 'total', kind: 'field' },
      'Account', // Looking for Account.total, not Other.total
    );

    // Implicit-this `total` inside Other class should be skipped when looking for Account.total.
    expect(result.occurrences.length).toBe(0);
    expect(result.skipped.length).toBeGreaterThanOrEqual(1);

    const skip = result.skipped[0];
    expect(skip.reason).toContain('implicit-this-wrong-enclosing-type');
  });

  it('handles method argument form of qualified field access', () => {
    const src = `public class Caller {
    public void test() {
        Account acct = new Account();
        process(acct.total);
    }
    public void process(Integer x) {}
}`;
    const table = parseSource(src, 'file:///test/Caller.cls');

    const result = findFieldOccurrences(
      table,
      'file:///test/Caller.cls',
      { name: 'total', kind: 'field' },
      'Account',
    );

    // The method arg `process(acct.total)` should be found (receiver type = Account).
    expect(result.occurrences.length).toBeGreaterThanOrEqual(1);

    const occ = result.occurrences[0];
    expect(occ.uri).toBe('file:///test/Caller.cls');
    // Line 4 (1-based) = `process(acct.total);`
    expect(occ.identifierRange.startLine).toBe(4);
  });

  // --- Adversarial-review regressions (W-23631084) ---------------------------

  it('does NOT rename a local variable that shadows the field name', () => {
    // A local `total` shadowing the field `total`: its usages are VARIABLE_USAGE
    // (which findOccurrencesInFile surfaces for the `field` kind), but they are
    // LOCAL, not implicit-this field access. Renaming them would corrupt code.
    const src = `public class Account {
    public Integer total;

    public void compute() {
        Integer total = 0;
        total = total + 1;
    }
}`;
    const table = parseSource(src, 'file:///test/Account.cls');
    const result = findFieldOccurrences(
      table,
      'file:///test/Account.cls',
      { name: 'total', kind: 'field' },
      'Account',
    );

    // None of the local usages are treated as field occurrences.
    expect(result.occurrences.length).toBe(0);
    expect(
      result.skipped.every((s) => s.reason === 'local-variable-shadow'),
    ).toBe(true);
    expect(result.skipped.length).toBeGreaterThan(0);
  });

  it('renames explicit this.field occurrences', () => {
    const src = `public class Account {
    public Integer total;

    public void inc() {
        this.total = this.total + 1;
    }
}`;
    const table = parseSource(src, 'file:///test/Account.cls');
    const result = findFieldOccurrences(
      table,
      'file:///test/Account.cls',
      { name: 'total', kind: 'field' },
      'Account',
    );

    // Both `this.total` usages resolve (receiver `this` → enclosing type Account).
    expect(result.occurrences.length).toBe(2);
    expect(
      result.occurrences.every((o) => o.identifierRange.startLine === 5),
    ).toBe(true);
  });

  it('does NOT match an inner class field when renaming the outer field', () => {
    // Outer and Inner both declare `total`. A bare `total` inside Inner.f() must
    // resolve to Inner (innermost enclosing type), not Outer.
    const src = `public class Outer {
    public Integer total;

    public class Inner {
        public Integer total;

        public void f() {
            total = 5;
        }
    }
}`;
    const table = parseSource(src, 'file:///test/Outer.cls');
    const result = findFieldOccurrences(
      table,
      'file:///test/Outer.cls',
      { name: 'total', kind: 'field' },
      'Outer',
    );

    // Inner.f()'s `total` is Inner-scoped → not an Outer.total occurrence.
    expect(result.occurrences.length).toBe(0);
  });
});
