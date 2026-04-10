# Testing Quick Start

This is the fastest path to validate changes in this repo.

## Local Validation

Run from repo root:

```bash
npm run compile
npm run lint
npm run test
npm run bundle
```

For e2e coverage:

```bash
npm run test:e2e
```

## CI Workflows to Use

Use GitHub Actions for these workflows:

- `ci.yml` for compile/lint/test/package verification
- `e2e-tests.yml` for web and desktop Playwright validation
- `package.yml` for VSIX packaging checks
- `nightly.yml` and `nightly-extensions.yml` for extension release flow (including dry-run)
- `release-npm.yml` for npm package release flow

## Suggested Validation Order

1. Run local validation commands.
2. Open a PR to trigger `ci.yml`.
3. Run `e2e-tests.yml` (web by default, desktop or both via workflow input).
4. Run release workflows in dry-run mode before any real publish.

## Release Readiness Checklist

- [ ] `npm run compile` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] `npm run bundle` passes
- [ ] `e2e-tests.yml` results are acceptable
- [ ] Dry-run release workflows complete successfully
- [ ] Required GitHub secrets are configured (`NPM_TOKEN`, `VSCE_PAT`, `OVSX_PAT`, etc.)
