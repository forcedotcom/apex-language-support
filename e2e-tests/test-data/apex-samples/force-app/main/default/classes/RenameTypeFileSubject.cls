// renameType e2e fixture (W-23631150): top-level class with two constructors.
public with sharing class RenameTypeFileSubject {
    public Integer size;

    public RenameTypeFileSubject() {
        this.size = 0;
    }

    public RenameTypeFileSubject(Integer initial) {
        this.size = initial;
    }
}
