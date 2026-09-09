/*
 * Descendant override that is the RENAME SOURCE for case 2 (W-23631134).
 * Renaming `refreshCache()` from this override must propagate UP to the base
 * declaration (RenameMethodDescendantBase) and ACROSS to the sibling override
 * (RenameMethodDescendantSibling). The `child.refreshCache()` call below is a
 * provable occurrence because `child` is declared as this family subtype.
 */
public class RenameMethodDescendantChild extends RenameMethodDescendantBase {
    public override void refreshCache() {
    }

    public void runRefresh() {
        RenameMethodDescendantChild child = new RenameMethodDescendantChild();
        child.refreshCache();
    }
}
