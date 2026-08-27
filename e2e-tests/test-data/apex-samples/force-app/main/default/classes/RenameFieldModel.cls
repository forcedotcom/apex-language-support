// Fixture for cross-file renameField e2e (W-23631087 / 4.3). `quantity` is a
// public field consumed by RenameFieldClient.cls through a locally-typed
// instance, so renaming it must edit BOTH this declaration and the caller's
// field-access occurrences (a two-file WorkspaceEdit).
public with sharing class RenameFieldModel {
    public Integer quantity = 0;
}
