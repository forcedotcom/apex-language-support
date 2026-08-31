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
import { findMethodOccurrences } from '../../../src/symbols/ops/findMethodOccurrences';

describe('findMethodOccurrences', () => {
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

  // --- Receiver forms -------------------------------------------------------

  it('matches a bare implicit-this call in the declaring type', () => {
    const src = `public class Svc {
    public void foo() {}
    public void run() {
        foo();
    }
}`;
    const table = parseSource(src, 'file:///t/Svc.cls');
    const result = findMethodOccurrences(
      table,
      'file:///t/Svc.cls',
      { name: 'foo', kind: 'method', signature: [] },
      'Svc',
    );

    expect(result.unsafe.length).toBe(0);
    expect(
      result.occurrences.some((o) => o.identifierRange.startLine === 4),
    ).toBe(true);
  });

  it('matches an explicit this.foo() call', () => {
    const src = `public class Svc {
    public void foo() {}
    public void run() {
        this.foo();
    }
}`;
    const table = parseSource(src, 'file:///t/Svc.cls');
    const result = findMethodOccurrences(
      table,
      'file:///t/Svc.cls',
      { name: 'foo', kind: 'method', signature: [] },
      'Svc',
    );

    expect(result.unsafe.length).toBe(0);
    // `this.foo()` resolves to the enclosing type (Svc) → occurrence on line 4.
    expect(
      result.occurrences.some((o) => o.identifierRange.startLine === 4),
    ).toBe(true);
  });

  it('matches an instance-variable-qualified call obj.foo()', () => {
    const src = `public class Caller {
    public void run(Svc s) {
        s.foo();
    }
}`;
    const table = parseSource(src, 'file:///t/Caller.cls');
    const result = findMethodOccurrences(
      table,
      'file:///t/Caller.cls',
      { name: 'foo', kind: 'method', signature: [] },
      'Svc',
    );

    // `s` is declared Svc → receiver in family → occurrence. No decline.
    expect(result.unsafe.length).toBe(0);
    expect(
      result.occurrences.some((o) => o.identifierRange.startLine === 3),
    ).toBe(true);
  });

  it('matches a static call Type.foo() of the declaring type', () => {
    const src = `public class Caller {
    public void run() {
        Svc.foo();
    }
}`;
    const table = parseSource(src, 'file:///t/Caller.cls');
    const result = findMethodOccurrences(
      table,
      'file:///t/Caller.cls',
      { name: 'foo', kind: 'method', signature: [] },
      'Svc',
    );

    expect(result.unsafe.length).toBe(0);
    expect(
      result.occurrences.some((o) => o.identifierRange.startLine === 3),
    ).toBe(true);
  });

  // --- Not matched: unrelated receiver --------------------------------------

  it('does NOT match a call in an unrelated class (receiver type not in family)', () => {
    // `Other` has no superclass/interfaces and is outside the family, so a bare
    // `foo()` inside it is a proven-unrelated method — safely skipped, never a
    // decline.
    const src = `public class Other {
    public void foo() {}
    public void run() {
        foo();
    }
}`;
    const table = parseSource(src, 'file:///t/Other.cls');
    const result = findMethodOccurrences(
      table,
      'file:///t/Other.cls',
      { name: 'foo', kind: 'method', signature: [] },
      'Svc', // renaming Svc.foo, not Other.foo
    );

    expect(result.occurrences.length).toBe(0);
    expect(result.unsafe.length).toBe(0);
    expect(
      result.skipped.some((s) =>
        s.reason.startsWith('implicit-this-unrelated-type'),
      ),
    ).toBe(true);
  });

  it('safely skips an instance call on an unrelated local type', () => {
    const src = `public class Caller {
    public class Other {
        public void foo() {}
    }
    public void run() {
        Other o = new Other();
        o.foo();
    }
}`;
    const table = parseSource(src, 'file:///t/Caller.cls');
    const result = findMethodOccurrences(
      table,
      'file:///t/Caller.cls',
      { name: 'foo', kind: 'method', signature: [] },
      'Svc',
    );

    expect(result.occurrences.length).toBe(0);
    expect(result.unsafe.length).toBe(0);
    expect(
      result.skipped.some((s) => s.reason.startsWith('receiver-type-mismatch')),
    ).toBe(true);
  });

  // --- Overloads ------------------------------------------------------------

  it('separates arity-distinct overloads (0-arg target ignores 1-arg call)', () => {
    const src = `public class Svc {
    public void foo() {}
    public void foo(Integer a) {}
    public void run() {
        foo();
        foo(1);
    }
}`;
    const table = parseSource(src, 'file:///t/Svc.cls');
    const result = findMethodOccurrences(
      table,
      'file:///t/Svc.cls',
      { name: 'foo', kind: 'method', signature: [] }, // the 0-arg overload
      'Svc',
    );

    expect(result.unsafe.length).toBe(0);
    // The `foo(1)` call (arity 1) is a different overload → skipped by arity.
    expect(
      result.skipped.some((s) => s.reason.startsWith('arity-mismatch')),
    ).toBe(true);
    // The bare `foo()` (arity 0) is an occurrence; the declaration is too.
    expect(
      result.occurrences.some((o) => o.identifierRange.startLine === 5),
    ).toBe(true);
    expect(
      result.occurrences.some((o) => o.identifierRange.startLine === 6),
    ).toBe(false);
  });

  it('matches a single-overload arity-only call with an UNTYPED argument', () => {
    // Only one `foo` at arity 1; the parser cannot statically type `x`, so the
    // call is untyped. Arity alone is sufficient → still a match (the rename
    // must not decline on ordinary code).
    const src = `public class Svc {
    public void foo(Integer a) {}
    public void run(Integer x) {
        foo(x);
    }
}`;
    const table = parseSource(src, 'file:///t/Svc.cls');
    const result = findMethodOccurrences(
      table,
      'file:///t/Svc.cls',
      { name: 'foo', kind: 'method', signature: ['Integer'] },
      'Svc',
    );

    expect(result.unsafe.length).toBe(0);
    expect(
      result.occurrences.some((o) => o.identifierRange.startLine === 4),
    ).toBe(true);
  });

  it('declines an untyped call when multiple same-arity overloads exist', () => {
    // Two `foo` overloads at arity 1 and an untyped call `foo(x)` — cannot
    // disambiguate which overload it binds → unsafe → decline.
    const src = `public class Svc {
    public void foo(Integer a) {}
    public void foo(String a) {}
    public void run(Object x) {
        foo(x);
    }
}`;
    const table = parseSource(src, 'file:///t/Svc.cls');
    const result = findMethodOccurrences(
      table,
      'file:///t/Svc.cls',
      { name: 'foo', kind: 'method', signature: ['Integer'] },
      'Svc',
    );

    expect(
      result.unsafe.some((u) => u.reason === 'ambiguous-overload-untyped'),
    ).toBe(true);
  });

  // --- Family cone ----------------------------------------------------------

  it('matches an override call on a family member when familyFqns provided', () => {
    // `Child c; c.foo()` — Child is a family member (subtype). With familyFqns
    // supplied, the override call site is an occurrence.
    const src = `public class Caller {
    public void run(Child c) {
        c.foo();
    }
}`;
    const table = parseSource(src, 'file:///t/Caller.cls');
    const result = findMethodOccurrences(
      table,
      'file:///t/Caller.cls',
      { name: 'foo', kind: 'method', signature: [] },
      'Base',
      { familyFqns: new Set(['Child']) },
    );

    expect(result.unsafe.length).toBe(0);
    expect(
      result.occurrences.some((o) => o.identifierRange.startLine === 3),
    ).toBe(true);
  });

  it('without familyFqns, only the declaring type matches (family call skipped)', () => {
    const src = `public class Caller {
    public class Child {
        public void foo() {}
    }
    public void run() {
        Child c = new Child();
        c.foo();
    }
}`;
    const table = parseSource(src, 'file:///t/Caller.cls');
    const result = findMethodOccurrences(
      table,
      'file:///t/Caller.cls',
      { name: 'foo', kind: 'method', signature: [] },
      'Base', // Child not in family (no familyFqns)
    );

    // Child (local, no superclass/interfaces) is provably unrelated → skip.
    expect(result.occurrences.length).toBe(0);
    expect(result.unsafe.length).toBe(0);
    expect(
      result.skipped.some((s) => s.reason.startsWith('receiver-type-mismatch')),
    ).toBe(true);
  });

  // --- Unsafe receiver forms ------------------------------------------------

  it('declines a multi-hop chained call a.b.foo()', () => {
    const src = `public class Svc {
    public void foo() {}
    public Svc a() { return null; }
    public Svc b() { return null; }
    public void run() {
        a().b().foo();
    }
}`;
    const table = parseSource(src, 'file:///t/Svc.cls');
    const result = findMethodOccurrences(
      table,
      'file:///t/Svc.cls',
      { name: 'foo', kind: 'method', signature: [] },
      'Svc',
    );

    expect(
      result.unsafe.some((u) => u.reason === 'multi-hop-receiver-unprovable'),
    ).toBe(true);
    // The multi-hop `.foo()` (line 6) is never a confirmed occurrence.
    expect(
      result.occurrences.some((o) => o.identifierRange.startLine === 6),
    ).toBe(false);
  });

  it('declines a super.foo() ancestor call', () => {
    const src = `public class Child extends Base {
    public void run() {
        super.foo();
    }
}`;
    const table = parseSource(src, 'file:///t/Child.cls');
    const result = findMethodOccurrences(
      table,
      'file:///t/Child.cls',
      { name: 'foo', kind: 'method', signature: [] },
      'Base',
      { familyFqns: new Set(['Child']) },
    );

    expect(result.occurrences.length).toBe(0);
    expect(
      result.unsafe.some((u) => u.reason === 'super-receiver-unprovable'),
    ).toBe(true);
  });

  it('declines a method-result receiver getSvc().foo()', () => {
    const src = `public class Caller {
    public Svc getSvc() { return null; }
    public void run() {
        getSvc().foo();
    }
}`;
    const table = parseSource(src, 'file:///t/Caller.cls');
    const result = findMethodOccurrences(
      table,
      'file:///t/Caller.cls',
      { name: 'foo', kind: 'method', signature: [] },
      'Svc',
    );

    expect(result.occurrences.length).toBe(0);
    expect(
      result.unsafe.some(
        (u) => u.reason === 'non-variable-receiver-unprovable',
      ),
    ).toBe(true);
  });

  it('flags a bare call in a SUBCLASS-like type (has superclass) as unsafe', () => {
    // Sub extends Base and is NOT in the family set here, so a bare `foo()` in
    // Sub could be an inherited Base.foo — unprovable standalone → unsafe.
    const src = `public class Sub extends Base {
    public void run() {
        foo();
    }
}`;
    const table = parseSource(src, 'file:///t/Sub.cls');
    const result = findMethodOccurrences(
      table,
      'file:///t/Sub.cls',
      { name: 'foo', kind: 'method', signature: [] },
      'Base', // Sub not in family
    );

    expect(result.occurrences.length).toBe(0);
    expect(
      result.unsafe.some((u) =>
        u.reason.startsWith('implicit-this-possible-inherited'),
      ),
    ).toBe(true);
  });

  // --- No-body declarations (interface / abstract) --------------------------

  it('matches an interface method declaration (no body)', () => {
    // The interface method `area()` has no body; the op must still surface its
    // declaration/reference set without error.
    const src = `public interface Shape {
    Double area();
}`;
    const table = parseSource(src, 'file:///t/Shape.cls');
    const result = findMethodOccurrences(
      table,
      'file:///t/Shape.cls',
      { name: 'area', kind: 'method', signature: [] },
      'Shape',
    );

    // No call sites and no crash; nothing is flagged unsafe.
    expect(result.unsafe.length).toBe(0);
  });

  it('handles an abstract (no-body) method plus a concrete call', () => {
    const src = `public abstract class Base {
    public abstract void foo();
    public void run() {
        foo();
    }
}`;
    const table = parseSource(src, 'file:///t/Base.cls');
    const result = findMethodOccurrences(
      table,
      'file:///t/Base.cls',
      { name: 'foo', kind: 'method', signature: [] },
      'Base',
    );

    // The bare `foo()` inside Base resolves to the enclosing (declaring) type.
    expect(result.unsafe.length).toBe(0);
    expect(
      result.occurrences.some((o) => o.identifierRange.startLine === 4),
    ).toBe(true);
  });
});
