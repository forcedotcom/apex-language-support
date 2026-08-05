/**
 * Qualified type arguments must remain structural while nested in collections.
 */
public class QualifiedNestedParameterized {
    List<Map<String, Schema.SObjectType>> nestedQualifiedType;
    Map<String, List<System.URL>> qualifiedSystemType;
}
