/**
 * Static method accesses obj.Id via local variable.
 * Uses HasIdField which has an Id property - mirrors property.Id pattern.
 */
public class PropertyIdAccess {
    @isTest
    static void testPropertyId() {
        HasIdField obj = new HasIdField();
        String recordId = obj.Id;
    }
}

