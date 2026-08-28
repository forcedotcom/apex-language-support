// Cross-file renameField e2e fixture (W-23631087): `quantity` is consumed by
// RenameFieldClient, so renaming it must edit both files.
public with sharing class RenameFieldModel {
    public Integer quantity = 0;
}
