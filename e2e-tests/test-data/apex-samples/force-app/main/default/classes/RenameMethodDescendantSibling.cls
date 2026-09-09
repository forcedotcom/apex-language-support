/*
 * Sibling override for case 2 (W-23631134). A SECOND subclass of
 * RenameMethodDescendantBase that also overrides `refreshCache()`. When the
 * rename is driven from RenameMethodDescendantChild, this sibling override must
 * also be renamed (it shares the base declaration in the type-family cone).
 */
public class RenameMethodDescendantSibling extends RenameMethodDescendantBase {
    public override void refreshCache() {
    }
}
