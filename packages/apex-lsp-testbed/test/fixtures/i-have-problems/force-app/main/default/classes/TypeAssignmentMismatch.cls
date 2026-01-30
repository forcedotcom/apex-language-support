/**
 * Demonstrates: Type mismatch assignments
 * Error Code: type.mismatch
 * Validator: TypeAssignmentValidator (TIER 2)
 */
public class TypeAssignmentMismatch {
    public void myMethod() {
        // Assigning Integer to String - type mismatch error!
        String name = 123;
        
        // Assigning incompatible types
        Integer count = 'hello';
    }
    
    // Field declaration with type mismatch
    String field = 456; // Assigning Integer to String - error!
}
