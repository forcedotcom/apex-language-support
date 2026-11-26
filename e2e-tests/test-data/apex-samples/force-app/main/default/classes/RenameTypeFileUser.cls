// Consumer for the file-rename renameType e2e (W-23631150).
public with sharing class RenameTypeFileUser {
    public Integer build() {
        RenameTypeFileSubject made = new RenameTypeFileSubject(3);
        return made.size;
    }
}
