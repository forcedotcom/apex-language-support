// renameType e2e fixture (W-23631150): rename started from the constructor declaration.
public with sharing class RenameTypeCtorTarget {
    public Integer size;

    public RenameTypeCtorTarget() {
        this.size = 1;
    }
}
