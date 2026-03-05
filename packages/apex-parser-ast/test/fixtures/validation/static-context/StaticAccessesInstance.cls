/**
 * Static method accesses instance field and properties via local variable.
 * All accesses are valid: v1.instanceField, v1.instanceProp (instance via instance),
 * InstanceFieldAndProps.staticProp (static via class).
 */
public class StaticAccessesInstance {
    public static void d() {
        InstanceFieldAndProps v1 = new InstanceFieldAndProps();
        String s = v1.instanceField;
        String p = v1.instanceProp;
        String sp = InstanceFieldAndProps.staticProp;
    }
}
