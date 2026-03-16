// @ts-check
/// <reference types="vscode" />

const vscode = require('vscode');
const { MemFSProvider } = require('./memfsProvider');

function activate(context) {
  const memfs = new MemFSProvider();
  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider('memfs', memfs, {
      isCaseSensitive: true,
    }),
  );

  // Pre-populate test Apex classes for outline regression testing
  const encoder = new TextEncoder();
  const basePath = '/MyProject/force-app/main/default/classes';

  // Ensure parent directories exist
  const dirs = basePath.split('/').filter(Boolean);
  let current = '';
  for (const dir of dirs) {
    current += '/' + dir;
    memfs.createDirectory(vscode.Uri.parse('memfs:' + current));
  }

  memfs.writeFile(
    vscode.Uri.parse(`memfs:${basePath}/Arrrrg.cls`),
    encoder.encode(
      [
        'public class Arrrrg {',
        '    public Arrrrg() {',
        "        System.debug('Arrrrg!');",
        '    }',
        '}',
      ].join('\n'),
    ),
    { create: true, overwrite: true },
  );

  memfs.writeFile(
    vscode.Uri.parse(`memfs:${basePath}/Bar.cls`),
    encoder.encode(
      [
        'public class Bar {',
        '    public static void doBar() {',
        "        System.debug('Bar');",
        '    }',
        '}',
      ].join('\n'),
    ),
    { create: true, overwrite: true },
  );

  memfs.writeFile(
    vscode.Uri.parse(`memfs:${basePath}/Foo.cls`),
    encoder.encode(
      [
        'public class Foo {',
        '    private String name;',
        '    public Foo(String name) {',
        '        this.name = name;',
        '    }',
        '    public String getName() {',
        '        return this.name;',
        '    }',
        '}',
      ].join('\n'),
    ),
    { create: true, overwrite: true },
  );

  console.log('[memfs-provider-test] Activated with 3 test Apex classes');
}

function deactivate() {}

module.exports = { activate, deactivate };
