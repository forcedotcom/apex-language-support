---
name: shipped-issues
description: Find open GitHub issues whose linked GUS work item is closed AND whose issue number appears in the shipped GitHub release notes, then close them. Use when user invokes /shipped-issues or asks to clean up shipped issues.
---

# Shipped Issues

Cross-reference open GitHub issues against closed GUS work items and the shipped release notes to identify issues that were fixed and released, but never closed on GitHub.

## Inputs

- Repo: `forcedotcom/apex-language-support`
- Shipped release notes: GitHub Releases on the repo. ALS has no tracked `CHANGELOG.md`; it ships via semantic-release and the release bodies on GitHub are the source of truth for what shipped. Aggregate recent release notes (stable + nightly) before cross-referencing.
- GUS alias: `gus` (see `.claude/skills/gus-cli/SKILL.md`)

## Workflow

### 1. Gather shipped release notes

```bash
# List recent releases (stable + pre-release/nightly) and dump their bodies.
gh release list --repo forcedotcom/apex-language-support --limit 100 \
  --json tagName,name,isPrerelease,publishedAt > /tmp/shipped-releases.json

# Concatenate the bodies of recent releases into one searchable file.
for tag in $(gh release list --repo forcedotcom/apex-language-support --limit 100 --json tagName --jq '.[].tagName'); do
  echo "===== $tag ====="
  gh release view "$tag" --repo forcedotcom/apex-language-support --json body --jq '.body'
done > /tmp/shipped-changelog.md
```

Do not switch branches; run from wherever the user is. Adjust `--limit` if older releases need to be covered.

### 2. List open issues with W- references

```bash
gh issue list --repo forcedotcom/apex-language-support --state open --limit 500 --search "W in:body" --json number,title,body,url > /tmp/shipped-issues.json
```

The `W in:body` filter narrows to issues that contain the letter W — overly broad but cheap. Locally extract `W-\d{6,9}` matches per issue (regex; multiple W- per issue is allowed). Drop issues with no match.

### 3. Query GUS for status of each W-

Batch in chunks of ~50 W- names per query to stay under SOQL limits:

```bash
sf data query --query "SELECT Id, Name, Status__c, Last_Modified_Internal_Closed_Date__c FROM ADM_Work__c WHERE Name IN ('W-1234567','W-2345678', ...)" -o gus --json
```

Closed terminal statuses (any of these counts as closed): see `.claude/skills/gus-cli/SKILL.md` § Status\_\_c values "Closed (terminal)". Note: git2gus on this repo uses `statusWhenClosed=CLOSED`, so a shipped/closed WI lands on a `Closed*` status.

Quick check: `Status__c LIKE 'Closed%' OR Status__c IN ('Completed','Fixed')`.

### 4. Filter to candidates

Keep an issue only when **every** W- on the issue resolves to a Closed/Completed status in GUS. If any linked W- is still open, skip the issue (work isn't all done).

### 5. Cross-reference shipped release notes

For each candidate issue number `N`, search the aggregated release notes in `/tmp/shipped-changelog.md` for any of:

- `ISSUE #N` (case-insensitive)
- `issues/N` (link form)
- `#N` only when the surrounding line clearly references an issue, not a PR

Semantic-release notes typically reference the **PR** that landed the fix rather than the issue. If a candidate's issue # has no direct hit, also resolve the PR(s) that mention the issue and confirm the PR appears in a release. Record the matched release tag + line for the closing comment.

If matched → issue is **shipped**. Record the matched release note line (and the release tag it came from) for the closing comment.

### 6. Present the report

Show a table to the user before closing anything:

| Issue | Title | W- | WI Status | Shipped in (release tag + note line) |
| ----- | ----- | -- | --------- | ------------------------------------ |

Also list any **near-miss** rows separately so the user can review:
- Issues where WIs are all closed but the issue # isn't in any release notes (maybe under-the-hood / not customer-facing)
- Issues where some W- are still open

### 7. Close issues — only after explicit user confirmation

For each confirmed issue, post a comment then close:

```bash
gh issue close <number> --repo forcedotcom/apex-language-support --comment "Closing — shipped in <release tag>. See release note: <verbatim line>. (Linked work item <W-XXXXXXXX> is closed.)"
```

Do **not** loop-close without user confirmation. If many issues, present the full list and ask "Close all N?" once.

## Edge cases

- **Multiple W- per issue, mixed status**: skip until all W- close.
- **Issue body mentions W- in a quoted error or unrelated context**: rare; surface as candidate anyway, the user reviews the table.
- **Release note hit on an internal/"under the hood" line**: still counts as shipped — user can opt out per-row.
- **Issue # shows up in release notes only as `[PR #N]`**: not a match by itself. Only `ISSUE #N` / `issues/N` indicate the issue. A PR reference can still confirm shipping if you've already tied that PR back to the issue (see step 5).
- **No release-note match but WI closed long ago**: list as near-miss, don't auto-close.
- **Nightly vs stable**: a fix may appear in a nightly/pre-release before a stable tag. Note which when reporting; the user decides whether nightly-only counts as shipped.

## Output format

End with a one-line summary: `Closed N issues; M near-misses for review.`
