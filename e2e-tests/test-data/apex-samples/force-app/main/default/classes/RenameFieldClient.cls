// Consumer for cross-file renameField e2e (W-23631087 / 4.3). Holds a
// locally-typed RenameFieldModel instance and reads/writes its `quantity`
// field, so a rename of RenameFieldModel.quantity must update these usages.
public with sharing class RenameFieldClient {
    public Integer useModel() {
        RenameFieldModel model = new RenameFieldModel();
        model.quantity = 5;
        return model.quantity;
    }
}
