/*
 * Implementing class for the interface-implementer case (W-23631134, case 3).
 * Implements RenameMethodContract from a separate file. The `handleRecord()`
 * method declaration and the `impl.handleRecord()` call below must both be
 * renamed when the interface method is renamed — `impl` is declared as this
 * implementor type, so the call is a provable family occurrence.
 */
public class RenameMethodImplementer implements RenameMethodContract {
    public void handleRecord() {
    }

    public void runHandle() {
        RenameMethodImplementer impl = new RenameMethodImplementer();
        impl.handleRecord();
    }
}
