/**
 * Defines a class with instance field, instance property, and static property.
 * Used by StaticAccessesInstance.cls to test that accessing these via instance
 * from a static method does not produce false INVALID_NON_STATIC_VARIABLE_CONTEXT.
 */
public class InstanceFieldAndProps {
    public String instanceField;
    public String instanceProp { get; set; }
    public static String staticProp { get; set; }
}
