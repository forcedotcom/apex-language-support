/*
 * Ancestor-override renameMethod e2e (W-23631134, case 1). Base virtual class
 * declaring `evaluateScore()`. Renaming THIS declaration must also rename the
 * subclass `override` declaration and the instance call site over in
 * RenameMethodAncestorChild.cls (cross-file, down the type-family cone).
 */
public virtual class RenameMethodAncestorBase {
    public virtual Integer evaluateScore() {
        return 1;
    }
}
