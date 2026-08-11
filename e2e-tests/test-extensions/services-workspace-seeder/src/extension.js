// @ts-check
/// <reference types="vscode" />

// Keep this test extension in one file: local VS Code Web extensions cannot
// load relative CommonJS modules.
const vscode = require('vscode');

const SERVICES_EXTENSION_ID = 'salesforce.salesforcedx-vscode-services';
const WORKSPACE_ROOT = vscode.Uri.parse('memfs:/dx-project');

/** @param {import('vscode').Uri} directory */
async function ensureDirectory(directory) {
  const segments = directory.path.split('/').filter(Boolean);
  let current = directory.with({ path: '/' });
  for (const segment of segments) {
    current = vscode.Uri.joinPath(current, segment);
    await vscode.workspace.fs.createDirectory(current);
  }
}

/** @param {import('vscode').ExtensionContext} context */
async function activate(context) {
  const services = vscode.extensions.getExtension(SERVICES_EXTENSION_ID);
  if (!services) {
    throw new Error(`${SERVICES_EXTENSION_ID} is required by the E2E seeder`);
  }

  // Services must register its memfs: provider before the fixture can be
  // written. Its activation promise resolves after provider setup completes.
  await services.activate();
  await ensureDirectory(WORKSPACE_ROOT);

  // Remove Services' generated sample project and any IndexedDB state from a
  // previous run so every E2E server starts from the repository fixture.
  for (const [name] of await vscode.workspace.fs.readDirectory(
    WORKSPACE_ROOT,
  )) {
    await vscode.workspace.fs.delete(
      vscode.Uri.joinPath(WORKSPACE_ROOT, name),
      {
        recursive: true,
        useTrash: false,
      },
    );
  }

  const manifestUri = vscode.Uri.joinPath(
    context.extensionUri,
    'workspace-files.json',
  );
  const manifestBytes = await vscode.workspace.fs.readFile(manifestUri);
  const manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
  const encoder = new TextEncoder();

  for (const [relativePath, contents] of Object.entries(manifest)) {
    const target = vscode.Uri.joinPath(WORKSPACE_ROOT, relativePath);
    await ensureDirectory(vscode.Uri.joinPath(target, '..'));
    await vscode.workspace.fs.writeFile(
      target,
      encoder.encode(String(contents)),
    );
  }

  console.log(
    `[services-workspace-seeder] Seeded ${Object.keys(manifest).length} files into ${WORKSPACE_ROOT.toString()}`,
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
