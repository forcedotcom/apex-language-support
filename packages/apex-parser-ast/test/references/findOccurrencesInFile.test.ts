/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CompilerService } from '../../src/parser/compilerService';
import { FullSymbolCollectorListener } from '../../src/parser/listeners/FullSymbolCollectorListener';
import { SymbolTable } from '../../src/types/symbol';
import { findOccurrencesInFile } from '../../src/symbols/ops/findOccurrencesInFile';

/** Parse Apex source into its own full-detail SymbolTable (no shared graph). */
const parse = (code: string, uri: string): SymbolTable => {
  const table = new SymbolTable();
  new CompilerService().compile(
    code,
    uri,
    new FullSymbolCollectorListener(table),
    {
      collectReferences: true,
      resolveReferences: true,
    },
  );
  return table;
};

describe('findOccurrencesInFile (find-references phase-2 standalone scan)', () => {
  it('finds exactly the qualified static method call sites, de-duplicated', () => {
    const uri = 'file:///t/GeocodingServiceTest.cls';
    const code = `private class GeocodingServiceTest {
       static void t1() { Object c = GeocodingService.geocodeAddresses(new List<GeocodingService.GeocodingAddress>{}); }
       static void t2() { Object c = GeocodingService.geocodeAddresses(new List<GeocodingService.GeocodingAddress>{}); }
       static void t3() { Object c = GeocodingService.geocodeAddresses(new List<GeocodingService.GeocodingAddress>{}); }
     }`;
    const matches = findOccurrencesInFile(parse(code, uri), uri, {
      name: 'geocodeAddresses',
      kind: 'method',
    });

    // Three call sites, one per method — no chain-artifact duplicates.
    expect(matches.length).toBe(3);
    matches.forEach((m) => expect(m.uri).toBe(uri));
    // Distinct lines.
    const lines = new Set(matches.map((m) => m.identifierRange.startLine));
    expect(lines.size).toBe(3);
  });

  it('does NOT match the method name inside a comment or string literal', () => {
    const uri = 'file:///t/NoiseTest.cls';
    const code = `public class NoiseTest {
       // this comment mentions geocodeAddresses but is not a call
       void t() {
         String s = 'geocodeAddresses is only text here';
         System.debug(s);
       }
     }`;
    const matches = findOccurrencesInFile(parse(code, uri), uri, {
      name: 'geocodeAddresses',
      kind: 'method',
    });
    expect(matches.length).toBe(0);
  });

  it('does NOT match a same-named FIELD when the target is a METHOD', () => {
    const uri = 'file:///t/FieldVsMethod.cls';
    // `status` appears as a method call AND as a field access. A method target
    // must surface only the call, not the field access.
    const code = `public class FieldVsMethod {
       Integer status;
       void go() {
         this.status = 1;
         Integer x = status();
       }
       Integer status2() { return status; }
     }`;
    const asMethod = findOccurrencesInFile(parse(code, uri), uri, {
      name: 'status',
      kind: 'method',
    });
    // Only the status() call — never the field reads/writes.
    expect(asMethod.every((m) => m.context === 0 /* METHOD_CALL */)).toBe(true);
    expect(asMethod.length).toBeGreaterThanOrEqual(1);
  });

  it('with an UNKNOWN kind, falls back to BOTH field-access and method-call contexts', () => {
    const uri = 'file:///t/FallbackKind.cls';
    // Same `status` name used as a field access AND as a method call. With no
    // kind (the by-name fallback path where the name is absent from the graph's
    // name index), the search must NOT narrow to one context — it applies
    // USAGE_CONTEXTS_FALLBACK and surfaces both the field read/write and the
    // method call.
    const code = `public class FallbackKind {
       Integer status;
       void go() {
         this.status = 1;
         Integer x = status();
       }
       Integer status2() { return status; }
     }`;
    // No `kind` supplied → contextsForKind(undefined) → USAGE_CONTEXTS_FALLBACK.
    const matches = findOccurrencesInFile(parse(code, uri), uri, {
      name: 'status',
    });
    const contexts = new Set(matches.map((m) => m.context));
    // Field access (FIELD_ACCESS = 3) is present...
    expect(contexts.has(3 /* FIELD_ACCESS */)).toBe(true);
    // ...and so is the method call (METHOD_CALL = 0): the fallback spans both.
    expect(contexts.has(0 /* METHOD_CALL */)).toBe(true);
  });

  it('is case-insensitive on the identifier (Apex semantics)', () => {
    const uri = 'file:///t/CaseTest.cls';
    const code = `public class CaseTest {
       void t() { Svc.DoThing(); }
     }`;
    const matches = findOccurrencesInFile(parse(code, uri), uri, {
      name: 'dothing',
      kind: 'method',
    });
    expect(matches.length).toBe(1);
  });

  it('returns nothing for an empty or whitespace target name', () => {
    const uri = 'file:///t/Empty.cls';
    const code = 'public class Empty { void t() { foo(); } }';
    expect(findOccurrencesInFile(parse(code, uri), uri, { name: '' })).toEqual(
      [],
    );
  });
});
