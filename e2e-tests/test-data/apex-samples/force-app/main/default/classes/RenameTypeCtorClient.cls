// Consumer for the constructor-declaration renameType e2e (W-23631150).
public with sharing class RenameTypeCtorClient {
    public Integer build() {
        RenameTypeCtorTarget made = new RenameTypeCtorTarget();
        return made.size;
    }
}
