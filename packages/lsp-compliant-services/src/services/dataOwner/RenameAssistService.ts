/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import {
  getLogger,
  type CheckMemberConflicts,
  type ResolveMethodRenameFamily,
} from '@salesforce/apex-lsp-shared';
import {
  doesSignatureMatch,
  inTypeSymbolGroup,
  SymbolKind,
  SymbolVisibility,
  type ApexSymbol,
  type ISymbolManager,
} from '@salesforce/apex-lsp-parser-ast';
import type { ApexStorageManager } from '../../storage/ApexStorageManager';
import { getTypeMembersFullDetail, walkTypeFamily } from './typeFamily';

/**
 * Data-owner side of rename validation and edit-target discovery, computed on
 * the COMPLETE workspace graph (the request pool cannot see unloaded files):
 * hierarchy-aware member-name conflict checks and method-family discovery.
 * Reached over the worker assistance bus; the worker platform owns queueing and
 * tracing.
 */
export class RenameAssistService {
  constructor(
    private readonly deps: {
      readonly symbolManager: ISymbolManager;
      readonly storageManager: ApexStorageManager;
    },
  ) {}

  public checkMemberConflicts(req: CheckMemberConflicts) {
    const svc = this.deps;
    return Effect.gen(function* () {
      // Guard: descendant/ancestor conflict detection requires the complete
      // inheritance cone, which only exists after endWorkspaceLoadSession
      // resolves supertype edges (ApexSymbolManager.ts:1285-1320). If a
      // session is still active, the graph is incomplete and findSubtypes/
      // findSupertypes will return partial results, risking false negatives.
      if (svc.symbolManager.isWorkspaceLoadSessionActive()) {
        return yield* Effect.fail({
          _tag: 'CheckMemberConflictsError' as const,
          message:
            'Workspace load session still active; hierarchy graph not yet complete for conflict detection',
        });
      }

      // Resolve the defining type by FQN
      const definingType = yield* Effect.promise(() =>
        svc.symbolManager.findSymbolByFQN(req.definingTypeFqn),
      );

      if (!definingType || !inTypeSymbolGroup(definingType)) {
        return yield* Effect.fail({
          _tag: 'CheckMemberConflictsError' as const,
          message: `Type not found or not a type symbol: ${req.definingTypeFqn}`,
        });
      }

      // No-op / case-only rename never conflicts with itself. The same-type
      // lookup cannot exclude the member being renamed, so total→total or
      // total→Total would self-conflict. When the caller supplies the
      // member's current name, short-circuit an identical (case-insensitive)
      // rename to conflict:false — mirrors jorje FieldRenameHandler's
      // short-circuit. Backward-compatible: absent currentName → unchanged.
      if (
        req.currentName &&
        req.newName.toLowerCase() === req.currentName.toLowerCase()
      ) {
        getLogger().info(
          () =>
            '[RENAME] CheckMemberConflicts: no-op/case-only rename ' +
            `${req.definingTypeFqn}.${req.currentName}→${req.newName}, no conflict`,
        );
        return { conflict: false };
      }

      const newNameLower = req.newName.toLowerCase();
      const memberKinds =
        req.memberKind === 'field'
          ? [SymbolKind.Field, SymbolKind.Property]
          : [SymbolKind.Method];

      // Helper: check if a member name matches (case-insensitive)
      const memberNameMatches = (
        memberName: string,
        targetName: string,
      ): boolean => memberName.toLowerCase() === targetName;

      // Helper: check if a symbol is private or default-visibility.
      // In Apex, Default visibility (no access modifier) is effectively
      // private for inheritance purposes — a default-visibility member is
      // NOT visible to subclasses. jorje's !has(PRIVATE) only treats
      // explicitly-visible (public/protected/global) members as conflicting.
      // NOTE: The caller (4.2 renameField) must also treat Default visibility
      // as private when computing isRenamedMemberPrivate for the descendant
      // conflict gate.
      const isPrivate = (symbol: ApexSymbol): boolean =>
        symbol.modifiers.visibility === SymbolVisibility.Private ||
        symbol.modifiers.visibility === SymbolVisibility.Default;

      // Resolve a type's full+complete member set (fails closed on an
      // unverifiable/truncated parse — see getTypeMembersFullDetail). Shared
      // with ResolveMethodRenameFamily via that module helper; re-tag its
      // string failure to this query's error type.
      const getTypeMembers = (type: ApexSymbol) =>
        getTypeMembersFullDetail(svc, type).pipe(
          Effect.mapError((message) => ({
            _tag: 'CheckMemberConflictsError' as const,
            message,
          })),
        );

      // Helper: check type for member with newName (as an Effect generator).
      // Methods overload on signature (WI 5.3): a same-named method is only
      // a conflict when its signature ALSO matches the renamed method's —
      // `foo(Integer)`→`bar` does NOT collide with an existing `bar(String)`
      // (a legal overload), but DOES collide with an existing `bar(Integer)`.
      // Fields/properties (and a signature-absent method request) keep the
      // name-only match.
      const hasMemberNamed = (
        type: ApexSymbol,
        name: string,
        kinds: (typeof SymbolKind)[keyof typeof SymbolKind][],
        excludePrivate: boolean,
      ) =>
        Effect.gen(function* () {
          const members = yield* getTypeMembers(type);
          return members.some((m) => {
            if (!kinds.includes(m.kind)) return false;
            if (!memberNameMatches(m.name, name)) return false;
            if (excludePrivate && isPrivate(m)) return false;
            if (
              req.memberKind === 'method' &&
              req.signature &&
              m.kind === SymbolKind.Method &&
              !doesSignatureMatch(m, name, [...req.signature])
            ) {
              // Same-named method but a DIFFERENT signature → legal overload,
              // not a conflict.
              return false;
            }
            return true;
          });
        });

      // 0. Self-verify the renamed member's effective visibility instead
      // of blindly trusting the caller's isRenamedMemberPrivate
      // (W-23631086 review, P2). The descendant conflict gate hinges on
      // this one bit: if a caller UNDER-reports privacy (claims private
      // when the field is actually public/protected/global), the
      // descendant walk is skipped and a real subclass collision goes
      // unreported — a destructive rename. When the caller identifies the
      // member (currentName), read its ACTUAL visibility from the same
      // full+complete defining-type table used for conflict checks, treat
      // Default as private (Apex inheritance semantics, matching isPrivate
      // above), and FAIL CLOSED on any disagreement — an inconsistent
      // request must not silently skip a hierarchy check. When currentName
      // is absent (legacy caller), fall back to the wire value unchanged.
      let effectiveRenamedMemberPrivate = req.isRenamedMemberPrivate;
      if (req.currentName) {
        const definingMembers = yield* getTypeMembers(definingType);
        const currentNameLower = req.currentName.toLowerCase();
        const renamedMember = definingMembers.find(
          (m) =>
            memberKinds.includes(m.kind) &&
            memberNameMatches(m.name, currentNameLower) &&
            // For an overloaded method, pick the exact overload by
            // signature so we read the RENAMED method's visibility (not a
            // sibling overload's) for the descendant gate.
            (req.memberKind === 'method' && req.signature
              ? m.kind === SymbolKind.Method &&
                doesSignatureMatch(m, req.currentName!, [...req.signature])
              : true),
        );
        if (!renamedMember) {
          return yield* Effect.fail({
            _tag: 'CheckMemberConflictsError' as const,
            message:
              'Cannot verify member conflicts: the member being renamed ' +
              `('${req.currentName}') was not found in ` +
              `${req.definingTypeFqn}, so its visibility cannot be ` +
              'confirmed and the descendant conflict gate cannot be ' +
              'trusted.',
          });
        }
        const verifiedPrivate = isPrivate(renamedMember);
        if (verifiedPrivate !== req.isRenamedMemberPrivate) {
          return yield* Effect.fail({
            _tag: 'CheckMemberConflictsError' as const,
            message:
              `Refusing to check conflicts for ${req.definingTypeFqn}.` +
              `${req.currentName}: caller reported ` +
              `isRenamedMemberPrivate=${req.isRenamedMemberPrivate} but ` +
              'the member is actually ' +
              `${verifiedPrivate ? 'private/default' : 'externally visible'}` +
              '; failing closed rather than skipping a hierarchy check on ' +
              'a stale visibility claim.',
          });
        }
        effectiveRenamedMemberPrivate = verifiedPrivate;
      }

      // 1. Check same-type conflict (no private filter)
      const sameTypeConflict = yield* hasMemberNamed(
        definingType,
        newNameLower,
        memberKinds,
        false,
      );
      if (sameTypeConflict) {
        getLogger().info(
          () =>
            `[RENAME] CheckMemberConflicts: conflict in same type ${req.definingTypeFqn}`,
        );
        return {
          conflict: true,
          conflictingTypeFqn: req.definingTypeFqn,
          reason: 'same-type' as const,
        };
      }

      // Static methods are NOT polymorphic: a same-name static in an
      // ancestor/descendant is legal method HIDING (a distinct member), not
      // a conflict — so only the same-type check (above) applies to statics
      // (WI 5.3 re-review). Skip the ancestor/descendant hierarchy walk that
      // instance members require, which otherwise over-declines valid static
      // renames.
      if (req.isStatic) {
        getLogger().info(
          () =>
            `[RENAME] CheckMemberConflicts: static ${req.definingTypeFqn}.` +
            `${req.newName} — same-type clear, skipping hierarchy walk`,
        );
        return { conflict: false };
      }

      // 2. Check ancestor conflict (exclude private members in ancestors)
      const { ancestors, descendants } = yield* walkTypeFamily(
        svc,
        definingType,
      );

      for (const ancestor of ancestors) {
        const ancestorConflict = yield* hasMemberNamed(
          ancestor,
          newNameLower,
          memberKinds,
          true, // Exclude private members
        );
        if (ancestorConflict) {
          const ancestorFqn =
            ancestor.fqn ||
            (yield* Effect.promise(() =>
              svc.symbolManager.constructFQN(ancestor),
            ));
          getLogger().info(
            () =>
              `[RENAME] CheckMemberConflicts: conflict in ancestor ${ancestorFqn}`,
          );
          return {
            conflict: true,
            conflictingTypeFqn: ancestorFqn,
            reason: 'ancestor' as const,
          };
        }
      }

      // 3. Check descendant conflict (only if renamed member is NOT
      // private). Gate on the self-verified visibility (step 0), NOT the
      // raw wire value.
      if (!effectiveRenamedMemberPrivate) {
        for (const descendant of descendants) {
          const descendantConflict = yield* hasMemberNamed(
            descendant,
            newNameLower,
            memberKinds,
            false, // NO private filter on descendant members
          );
          if (descendantConflict) {
            const descendantFqn =
              descendant.fqn ||
              (yield* Effect.promise(() =>
                svc.symbolManager.constructFQN(descendant),
              ));
            getLogger().info(
              () =>
                `[RENAME] CheckMemberConflicts: conflict in descendant ${descendantFqn}`,
            );
            return {
              conflict: true,
              conflictingTypeFqn: descendantFqn,
              reason: 'descendant' as const,
            };
          }
        }
      }

      // No conflict found
      getLogger().info(
        () =>
          `[RENAME] CheckMemberConflicts: no conflict for ${req.definingTypeFqn}.${req.newName}`,
      );
      return { conflict: false };
    });
  }

  public resolveMethodRenameFamily(req: ResolveMethodRenameFamily) {
    const svc = this.deps;
    return Effect.gen(function* () {
      // Same completeness precondition as CheckMemberConflicts: the family
      // walk needs the resolved inheritance cone, which only exists after
      // endWorkspaceLoadSession. Mid-load, findSubtypes/findSupertypes are
      // partial → we would miss override sites (a dangling partial rename).
      if (svc.symbolManager.isWorkspaceLoadSessionActive()) {
        return yield* Effect.fail({
          _tag: 'ResolveMethodRenameFamilyError' as const,
          message:
            'Workspace load session still active; hierarchy graph not ' +
            'yet complete for method family resolution',
        });
      }

      const { SymbolKind, inTypeSymbolGroup, doesSignatureMatch } =
        yield* Effect.promise(() => import('@salesforce/apex-lsp-parser-ast'));

      const definingType = yield* Effect.promise(() =>
        svc.symbolManager.findSymbolByFQN(req.definingTypeFqn),
      );
      if (!definingType || !inTypeSymbolGroup(definingType)) {
        return yield* Effect.fail({
          _tag: 'ResolveMethodRenameFamilyError' as const,
          message: `Type not found or not a type symbol: ${req.definingTypeFqn}`,
        });
      }

      const methodNameLower = req.methodName.toLowerCase();
      const targetArity = req.signature?.length;

      // Read a type's full+complete members once (cached by symbol ref —
      // ancestors are visited both when seeding introducers and in the main
      // loop, and re-enrichment is not free).
      const membersCache = new Map<ApexSymbol, ApexSymbol[]>();
      const membersOf = (type: ApexSymbol) =>
        Effect.gen(function* () {
          const cached = membersCache.get(type);
          if (cached) return cached;
          const members = yield* getTypeMembersFullDetail(svc, type).pipe(
            Effect.mapError((message) => ({
              _tag: 'ResolveMethodRenameFamilyError' as const,
              message,
            })),
          );
          membersCache.set(type, members);
          return members;
        });
      const declaresTargetSig = (members: ApexSymbol[]): boolean =>
        members.some(
          (m) =>
            m.kind === SymbolKind.Method &&
            m.name.toLowerCase() === methodNameLower &&
            (req.signature
              ? doesSignatureMatch(m, req.methodName, [...req.signature])
              : true),
        );

      // The occurrence family: types whose calls to this method must be
      // renamed. Instance methods fan out over the whole cone; ancestors
      // fold in extended/implemented interfaces and descendants fold in
      // implementors (findSupertypes/findSubtypes read both edge kinds).
      const family: ApexSymbol[] = [definingType];
      if (!req.isStatic) {
        const { ancestors, descendants } = yield* walkTypeFamily(
          svc,
          definingType,
        );
        family.push(...ancestors, ...descendants);

        // Sibling-override capture (review P2): the cursor's type can be a
        // MID-cone override, so a sibling that overrides the SAME method is
        // neither its ancestor nor its descendant — it would be silently
        // left behind (and, if it has no calls, nothing trips the unsafe
        // decline). Any ancestor (or the cursor type) that DECLARES the
        // signature INTRODUCES the method, so that introducer's full subtype
        // cone contains every override incl. siblings. Expand from each.
        for (const intro of [definingType, ...ancestors]) {
          if (!declaresTargetSig(yield* membersOf(intro))) continue;
          const subs = yield* Effect.promise(() =>
            svc.symbolManager.findSubtypes(intro),
          );
          for (const s of subs) if (inTypeSymbolGroup(s)) family.push(s);
        }
      } else {
        // Static methods ARE inherited and callable from subclasses in Apex
        // (an unqualified `foo()` in a subclass body, or `Sub.foo()`), so
        // calls to the inherited static are real occurrences that must be
        // renamed — include the DESCENDANT cone (W-23631132 re-review, 5.2).
        // But a subclass that REDECLARES a same-name static is method
        // HIDING — a DISTINCT method whose declaration and calls must NOT be
        // renamed — so exclude any descendant that declares its own matching
        // method; that file then fail-closes in the pool (unsafe → decline)
        // if it references the name, rather than being mis-renamed. Statics
        // have no override sites: only the declaring type declares this
        // method, so the overrideSites gate below (declaresTargetSig)
        // naturally yields just `definingType`. Ancestors are irrelevant —
        // they cannot see a subtype's static.
        const { descendants } = yield* walkTypeFamily(svc, definingType);
        for (const d of descendants) {
          if (!declaresTargetSig(yield* membersOf(d))) family.push(d);
        }
      }

      const familyFqns: string[] = [];
      const overrideSites: Array<{ typeFqn: string; fileUri: string }> = [];
      const seen = new Set<string>();
      // Distinct overload signatures (by param-type list) among family
      // methods named the target at the target arity. ≥2 ⇒ an UNTYPED call
      // at that arity cannot be attributed to the target overload (review
      // P1) — the pool must then decline it in every file.
      const overloadSigsAtArity = new Set<string>();
      const sigKeyOf = (m: ApexSymbol): string =>
        (
          (
            m as {
              parameters?: Array<{
                type?: { name?: string; originalTypeString?: string };
              }>;
            }
          ).parameters ?? []
        )
          .map((p) =>
            (p.type?.originalTypeString ?? p.type?.name ?? '').toLowerCase(),
          )
          .join(',');

      for (const type of family) {
        const typeFqn =
          type.fqn ||
          (yield* Effect.promise(() => svc.symbolManager.constructFQN(type)));
        if (!typeFqn || seen.has(typeFqn)) continue;
        seen.add(typeFqn);
        familyFqns.push(typeFqn);

        const members = yield* membersOf(type);

        // Accumulate distinct overload signatures at the target arity.
        for (const m of members) {
          if (
            m.kind !== SymbolKind.Method ||
            m.name.toLowerCase() !== methodNameLower
          )
            continue;
          const arity = ((m as { parameters?: unknown[] }).parameters ?? [])
            .length;
          if (targetArity === undefined || arity === targetArity) {
            overloadSigsAtArity.add(sigKeyOf(m));
          }
        }

        // Does this type DECLARE a signature-matching method to rename?
        if (declaresTargetSig(members) && type.fileUri) {
          overrideSites.push({ typeFqn, fileUri: type.fileUri });
        }
      }

      const targetArityAmbiguous = overloadSigsAtArity.size >= 2;

      getLogger().info(
        () =>
          `[RENAME] ResolveMethodRenameFamily: ${req.definingTypeFqn}.` +
          `${req.methodName} → ${familyFqns.length} family type(s), ` +
          `${overrideSites.length} override site(s)` +
          (targetArityAmbiguous ? ', arity-ambiguous' : ''),
      );
      return { familyFqns, overrideSites, targetArityAmbiguous };
    });
  }
}
