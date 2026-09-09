/*
 * Interface-implementer renameMethod e2e (W-23631134, case 3). Interface
 * declaring `handleRecord()`. Renaming THIS interface method must also rename
 * the implementing class's method declaration and its call site over in
 * RenameMethodImplementer.cls (the implementor is in the type-family cone).
 */
public interface RenameMethodContract {
    void handleRecord();
}
