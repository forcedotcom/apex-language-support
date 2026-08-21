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

  it('flags a non-local mismatched receiver as unsafe (cannot prove unrelated cross-file)', () => {
    // `Other` is NOT declared in this candidate file, so its supertype chain is
    // unknown here — it COULD be `Other extends Account` in Other.cls, making
    // `other.total` an inherited `Account.total`. This parse cannot refute that,
    // so it must be `unsafe` (→ decline), NOT a proven skip (W-23631086 review
    // finding #1: a cross-file subtype receiver must never be silently dropped
    // while the declaration renames).
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

    expect(result.occurrences.length).toBe(0);
    expect(result.skipped.length).toBe(0);
    expect(result.unsafe.length).toBeGreaterThanOrEqual(1);
    expect(result.unsafe[0].reason).toContain('receiver-subtype-unprovable');
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

    // Chained `a.inner.total` emits co-located receivers for BOTH the root `a`
    // and the immediate receiver `inner`, so it is classified as a chained access
    // (`chained-receiver-unprovable`) and declined — never a real Account.total
    // occurrence and never a safe skip.
    expect(result.occurrences.length).toBe(0);
    expect(result.skipped.length).toBe(0);
    expect(result.unsafe.length).toBeGreaterThanOrEqual(1);
    expect(
      result.unsafe.some((n) => n.reason.includes('chained-receiver')),
    ).toBe(true);
  });

  it('safely skips implicit-this usage in an UNRELATED type with no superclass', () => {
    // `Other` extends nothing, so its bare `total` cannot be an inherited
    // Account.total — it is a genuinely unrelated field. Safe to skip (the
    // caller still renames Account.total elsewhere); NOT unsafe.
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

    expect(result.occurrences.length).toBe(0);
    expect(result.unsafe.length).toBe(0);
    expect(result.skipped.length).toBeGreaterThanOrEqual(1);
    expect(result.skipped[0].reason).toContain('implicit-this-unrelated-type');
  });

  it('flags implicit-this usage in a SUBCLASS (has superclass) as unsafe', () => {
    // `Sub extends Account` COULD inherit Account.total, and this single-file
    // parse can't prove the chain, so a bare `total` in Sub is unsafe → decline.
    const src = `public class Sub extends Account {
    public void use() {
        total = 99;
    }
}`;
    const table = parseSource(src, 'file:///test/Sub.cls');

    const result = findFieldOccurrences(
      table,
      'file:///test/Sub.cls',
      { name: 'total', kind: 'field' },
      'Account',
    );

    expect(result.occurrences.length).toBe(0);
    expect(result.unsafe.length).toBeGreaterThanOrEqual(1);
    expect(result.unsafe[0].reason).toContain(
      'implicit-this-possible-inherited',
    );
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

  // --- W-23631084 review regressions: inherited-field references ------------
  // A single-file standalone parse cannot resolve a subclass→superclass
  // relationship, so a reference that MIGHT be the inherited field must be
  // flagged `unsafe` (→ caller declines) rather than silently skipped while the
  // declaration is renamed (which would emit a broken partial edit).

  it('flags super.field in a subclass as unsafe when renaming the ancestor field', () => {
    // `super.total` in Child refers to Account.total (Account declares it). This
    // file alone cannot prove Child extends Account, so `super` must NOT be
    // attributed to the enclosing type (Child) and dismissed — it is unsafe.
    const src = `public class Child extends Account {
    public void bump() {
        super.total = super.total + 1;
    }
}`;
    const table = parseSource(src, 'file:///test/Child.cls');
    const result = findFieldOccurrences(
      table,
      'file:///test/Child.cls',
      { name: 'total', kind: 'field' },
      'Account',
    );

    // No confirmed occurrences, and the super.total references are unsafe (never
    // safely skipped) so the caller declines rather than renaming Account.total
    // and leaving super.total dangling. (The parser emits `super` mostly as a
    // CLASS_REFERENCE, so some occurrences reach the implicit-this branch and
    // others the unresolvable-receiver branch — both are `unsafe`; what matters
    // is that NONE are safely skipped and NONE are confirmed occurrences.)
    expect(result.occurrences.length).toBe(0);
    expect(result.skipped.length).toBe(0);
    expect(result.unsafe.length).toBeGreaterThanOrEqual(1);
  });

  it('flags a bare inherited field read/write in a subclass as unsafe', () => {
    // Bare `total` in Child (extends Account) legitimately resolves to
    // Account.total. The enclosing type is Child, not Account, and this parse
    // can't prove the inheritance — so it is unsafe, not a safe skip.
    const src = `public class Child extends Account {
    public void bump() {
        total = 1;
        Integer x = total;
    }
}`;
    const table = parseSource(src, 'file:///test/Child.cls');
    const result = findFieldOccurrences(
      table,
      'file:///test/Child.cls',
      { name: 'total', kind: 'field' },
      'Account',
    );

    expect(result.occurrences.length).toBe(0);
    expect(result.unsafe.length).toBeGreaterThanOrEqual(1);
    expect(
      result.unsafe.every((u) =>
        u.reason.startsWith('implicit-this-possible-inherited'),
      ),
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

    // Inner.f()'s `total` is Inner-scoped → not an Outer.total occurrence, so it
    // is never renamed. Inner declares no superclass, so it cannot inherit
    // Outer.total — the bare `total` is a genuinely unrelated field, safely
    // skipped (not unsafe), and the rename is NOT declined.
    expect(result.occurrences.length).toBe(0);
    expect(result.unsafe.length).toBe(0);
  });

  // --- W-23631086 review finding #1: subtype receiver must not be a proven skip
  // A qualified receiver whose resolved type is a locally-visible SUBCLASS of the
  // declaring type is an INHERITED reference to the target field. Standalone we
  // can't prove the chain does NOT reach the declaring type, so it must be
  // `unsafe` (→ decline), NOT `skipped` (which would rename the declaration and
  // leave the subtype access dangling).

  it('flags a direct-subclass qualified receiver as unsafe (not a proven skip)', () => {
    // Child extends Base (both visible here as inner types). `c.total` where
    // c: Child is a possible inherited Base.total access. Renaming Base.total
    // must NOT silently drop it.
    const src = `public class Holder {
    public class Child extends Base {}

    public void use() {
        Child c = new Child();
        c.total = 1;
    }
}`;
    const table = parseSource(src, 'file:///test/Holder.cls');
    const result = findFieldOccurrences(
      table,
      'file:///test/Holder.cls',
      { name: 'total', kind: 'field' },
      'Base',
    );

    expect(result.occurrences.length).toBe(0);
    expect(result.skipped.length).toBe(0);
    expect(result.unsafe.length).toBeGreaterThanOrEqual(1);
    expect(result.unsafe[0].reason).toContain('receiver-subtype-unprovable');
  });

  it('flags a transitive-subclass qualified receiver as unsafe', () => {
    // GrandChild extends Child (which itself extends something, unknown here).
    // GrandChild declares a superclass → its ancestry could reach Base →
    // unprovable → unsafe.
    const src = `public class Holder {
    public class GrandChild extends Child {}

    public void use() {
        GrandChild g = new GrandChild();
        g.total = 1;
    }
}`;
    const table = parseSource(src, 'file:///test/Holder.cls');
    const result = findFieldOccurrences(
      table,
      'file:///test/Holder.cls',
      { name: 'total', kind: 'field' },
      'Base',
    );

    expect(result.occurrences.length).toBe(0);
    expect(result.unsafe.length).toBeGreaterThanOrEqual(1);
    expect(result.unsafe[0].reason).toContain('receiver-subtype-unprovable');
  });

  it('still safely skips a mismatched receiver with NO superclass', () => {
    // `Other` (declared locally, extends nothing) cannot inherit Account.total,
    // so `other.total` is a proven-unrelated field access → safe skip, NOT
    // unsafe. This is the disambiguation that keeps the cross-file rename usable.
    const src = `public class Holder {
    public class Other {}

    public void use() {
        Other other = new Other();
        other.total = 1;
    }
}`;
    const table = parseSource(src, 'file:///test/Holder.cls');
    const result = findFieldOccurrences(
      table,
      'file:///test/Holder.cls',
      { name: 'total', kind: 'field' },
      'Account',
    );

    expect(result.occurrences.length).toBe(0);
    expect(result.unsafe.length).toBe(0);
    expect(result.skipped.length).toBeGreaterThanOrEqual(1);
    expect(result.skipped[0].reason).toContain('receiver-type-mismatch');
  });

  // --- W-23631086 review finding #2: FQN-anchored nested-type disambiguation
  // `OuterOne.Inner.total` and `OuterTwo.Inner.total` share the short type name
  // `Inner`; only an FQN anchor distinguishes them. The producer sends the
  // graph FQN (which carries a block-scope name duplication like
  // `outerone.outerone.inner`); the op normalizes that to compare equal to its
  // own block-free `outerone.inner`.

  it('matches a nested inner-class field by FQN (block-artifact-insensitive)', () => {
    const src = `public class OuterOne {
    public class Inner {
        public Integer total;
        public void f() { total = 1; }
    }
}`;
    const table = parseSource(src, 'file:///test/OuterOne.cls');
    // Producer sends the graph FQN with the block-scope name duplication.
    const result = findFieldOccurrences(
      table,
      'file:///test/OuterOne.cls',
      { name: 'total', kind: 'field' },
      'outerone.outerone.inner',
    );

    // The declaration + the bare `total` inside Inner.f() are OuterOne.Inner's.
    expect(result.occurrences.length).toBeGreaterThanOrEqual(1);
    expect(result.unsafe.length).toBe(0);
  });

  it('does NOT match a different outer class`s same-named inner-class field', () => {
    // OuterTwo.Inner.total must NOT match when renaming OuterOne.Inner.total.
    const src = `public class OuterTwo {
    public class Inner {
        public Integer total;
        public void f() { total = 1; }
    }
}`;
    const table = parseSource(src, 'file:///test/OuterTwo.cls');
    const result = findFieldOccurrences(
      table,
      'file:///test/OuterTwo.cls',
      { name: 'total', kind: 'field' },
      'outerone.outerone.inner', // renaming OuterOne.Inner.total
    );

    // OuterTwo.Inner is a different FQN → the bare `total` is unrelated. Inner
    // declares no superclass → safe skip, not unsafe.
    expect(result.occurrences.length).toBe(0);
    expect(result.unsafe.length).toBe(0);
    expect(result.skipped.length).toBeGreaterThanOrEqual(1);
  });

  // --- W-23631086 review finding #4: static field access (`Type.total`) --------
  // `Account.total` emits a co-located class qualifier at the field token; the
  // op recognizes a non-variable receiver as a static type qualifier.

  it('matches a static field access `Type.total` of the declaring type', () => {
    const src = `public class Caller {
    public void t() {
        Integer x = Account.total;
        Account.total = 5;
    }
}`;
    const table = parseSource(src, 'file:///test/Caller.cls');
    const result = findFieldOccurrences(
      table,
      'file:///test/Caller.cls',
      { name: 'total', kind: 'field' },
      'Account',
    );

    // Both static accesses (read + assign) are occurrences of Account.total.
    expect(result.occurrences.length).toBe(2);
    expect(result.unsafe.length).toBe(0);
  });

  it('flags a static field access of a non-local DIFFERENT type as unsafe', () => {
    const src = `public class Caller {
    public void t() {
        Integer x = Other.total;
    }
}`;
    const table = parseSource(src, 'file:///test/Caller.cls');
    const result = findFieldOccurrences(
      table,
      'file:///test/Caller.cls',
      { name: 'total', kind: 'field' },
      'Account',
    );

    // `Other.total` is a static access of a type not declared here. Static
    // members ARE inherited in Apex, so if `Other extends Account` in Other.cls
    // this IS `Account.total`. Its hierarchy is unknown standalone → unprovable
    // → unsafe (→ decline), not a silent skip (W-23631086 review finding #1).
    expect(result.occurrences.length).toBe(0);
    expect(result.skipped.length).toBe(0);
    expect(result.unsafe.length).toBeGreaterThanOrEqual(1);
    expect(result.unsafe[0].reason).toContain('receiver-subtype-unprovable');
  });

  it('flags a cross-file subclass receiver (declaration not in this file) as unsafe', () => {
    // The reviewer's exact reproduction: a plain caller file with `Child c;
    // c.total` where `Child` is declared ELSEWHERE (Child.cls, `Child extends
    // Base`). Standalone, findLocalType('Child') is null, so we cannot prove
    // Child is outside Base's subtype cone. Renaming `Base.total` must NOT drop
    // `c.total` as a proven skip — it is unsafe → the whole rename declines.
    const src = `public class Caller {
    public void use(Child c) {
        c.total = 1;
        Integer x = c.total;
    }
}`;
    const table = parseSource(src, 'file:///test/Caller.cls');
    const result = findFieldOccurrences(
      table,
      'file:///test/Caller.cls',
      { name: 'total', kind: 'field' },
      'Base',
    );

    expect(result.occurrences.length).toBe(0);
    expect(result.skipped.length).toBe(0);
    expect(result.unsafe.length).toBeGreaterThanOrEqual(1);
    expect(
      result.unsafe.every((u) =>
        u.reason.startsWith('receiver-subtype-unprovable'),
      ),
    ).toBe(true);
  });

  // --- W-23631086 re-review P1: chained receivers must not be classified by the
  // ROOT receiver. `a.inner.total` emits co-located receivers for BOTH `a` (root)
  // and `inner` (immediate); classifying by `a` (a local Container with no
  // superclass) would treat a real `inner.total` (inner: Account) as unrelated
  // and skip it. A chained access must be `unsafe` → decline.

  it('flags a chained field access as unsafe (root receiver must not classify it)', () => {
    // `inner` is the immediate receiver and is typed Account (the declaring
    // type), so `a.inner.total` IS Account.total — it must NOT be dropped as a
    // Container mismatch while renaming Account.total.
    const src = `public class Caller {
    public class Container {
        public Account inner;
    }
    public void t() {
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

    expect(result.occurrences.length).toBe(0);
    expect(result.skipped.length).toBe(0);
    expect(result.unsafe.length).toBeGreaterThanOrEqual(1);
    expect(
      result.unsafe.every((u) => u.reason.startsWith('chained-receiver')),
    ).toBe(true);
  });

  it('declines a chained access whose leaf receiver IS the declaring type', () => {
    // Same shape, renaming the field on the type the leaf receiver resolves to.
    // The occurrence is real but unprovable standalone → unsafe (never skipped).
    const src = `public class Caller {
    public class Wrapper {
        public Account acct;
    }
    public void t() {
        Wrapper w = new Wrapper();
        w.acct.total = 7;
    }
}`;
    const table = parseSource(src, 'file:///test/Caller.cls');
    const result = findFieldOccurrences(
      table,
      'file:///test/Caller.cls',
      { name: 'total', kind: 'field' },
      'Account',
    );

    expect(result.occurrences.length).toBe(0);
    expect(result.skipped.length).toBe(0);
    expect(result.unsafe.length).toBeGreaterThanOrEqual(1);
  });

  // --- W-23631086 re-review P1: findLocalType must not prove a hierarchy
  // mismatch by an AMBIGUOUS leaf name. Two nested `Child` types where one
  // extends the declaring type: matching the first (no-superclass) one would let
  // the real subclass receiver be skipped.

  it('flags a repeated-inner-name subclass receiver as unsafe (no leaf-name false skip)', () => {
    // OuterOne.Child (no superclass) is declared BEFORE OuterTwo.Child extends
    // Base. `c` is OuterTwo.Child, so `c.total` may inherit Base.total. A leaf
    // lookup would pick OuterOne.Child and wrongly skip; the FQN/ambiguity guard
    // must classify it unsafe.
    const src = `public class Holder {
    public class OuterOne {
        public class Child {}
    }
    public class OuterTwo {
        public class Child extends Base {}
    }
    public void t() {
        OuterTwo.Child c = new OuterTwo.Child();
        c.total = 5;
    }
}`;
    const table = parseSource(src, 'file:///test/Holder.cls');
    const result = findFieldOccurrences(
      table,
      'file:///test/Holder.cls',
      { name: 'total', kind: 'field' },
      'Base',
    );

    expect(result.occurrences.length).toBe(0);
    expect(result.skipped.length).toBe(0);
    expect(result.unsafe.length).toBeGreaterThanOrEqual(1);
  });
});
