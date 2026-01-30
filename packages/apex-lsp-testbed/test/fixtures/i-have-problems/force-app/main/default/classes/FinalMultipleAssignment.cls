/**
 * Demonstrates: Final variable assigned multiple times
 * Error Code: invalid.final.field.assignment
 * Validator: FinalAssignmentValidator (TIER 1)
 */
public class FinalMultipleAssignment {
    public void myMethod() {
        final Integer x = 5;
        x = 10; // First reassignment - error!
        x = 20; // Second reassignment - error!
    }
}
