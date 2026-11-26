// Consumer for the new-expression renameType e2e (W-23631150).
public with sharing class RenameTypeNewClient {
    public Integer build() {
        RenameTypeNewTarget made = new RenameTypeNewTarget();
        return made.size;
    }
}
