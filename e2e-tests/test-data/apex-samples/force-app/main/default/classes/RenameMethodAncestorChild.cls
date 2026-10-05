/*
 * Subclass override + call site for the ancestor-override case
 * (W-23631134, case 1). Extends RenameMethodAncestorBase from a separate file.
 * The `override evaluateScore()` declaration and the `child.evaluateScore()`
 * instance call below must both be renamed when the base method is renamed —
 * `child` is declared as the family subtype, so the call is a provable
 * occurrence (not a decline-triggering unprovable receiver).
 */
public class RenameMethodAncestorChild extends RenameMethodAncestorBase {
    public override Integer evaluateScore() {
        return 2;
    }

    public Integer runScore() {
        RenameMethodAncestorChild child = new RenameMethodAncestorChild();
        return child.evaluateScore();
    }
}
