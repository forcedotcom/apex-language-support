// Consumer for the cross-file renameField e2e (W-23631087): reads/writes
// RenameFieldModel.quantity through a local instance.
public with sharing class RenameFieldClient {
    public Integer useModel() {
        RenameFieldModel model = new RenameFieldModel();
        model.quantity = 5;
        return model.quantity;
    }
}
