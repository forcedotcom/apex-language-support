/*
 * Descendant-override renameMethod e2e (W-23631134, case 2). Base virtual class
 * declaring `refreshCache()`. The rename is driven from a SUBCLASS override
 * (RenameMethodDescendantChild); renaming up the cone must also rename THIS base
 * declaration and the sibling override in RenameMethodDescendantSibling.cls.
 */
public virtual class RenameMethodDescendantBase {
    public virtual void refreshCache() {
    }
}
