---
name: packageJson
description: Guidelines for package.json files in packages
---

## Name

any package that's not an npm package should be named @salesforce/foo (whether it actually published to npm or not)
don't rename packages, but do tell the user when stuff doesn't match the rules

## types

on an extension, you only need a `types` prop if your extension will be an extensionDependency of some other extension.

probably not necessary for non-extension packages.

## browser

only for web-enabled extensions. Must point to a bundled dist file

## npm packages

packages that publish to npm should have a `files` property in the package.json

## scripts

See [wireit skill](../wireit/SKILL.md)

## dependencies

use `*` as the version for anything that's another package in this repo

## devDependencies

packages should not duplicate devDependencies that exist at the top level of the repo.

## vscode "contributes"

### Tips

- anything in `commands` will appear in command palette. If you don't want that, you have to `never` or use some `when` under commandPalette
- commands need a unique ID, 2 extensions contributing the same config will produce a UI warning
- never create a "default:true" boolean configuration (it's hard to override user/workspace)
