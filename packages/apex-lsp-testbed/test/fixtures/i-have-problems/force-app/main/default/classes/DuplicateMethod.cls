/**
 * Demonstrates: Duplicate method signatures
 * Error Code: method.already.exists
 * Validator: DuplicateMethodValidator (TIER 1)
 */
public class DuplicateMethod {
    public void doWork() {
        // First method
    }
    
    public void doWork() {
        // Duplicate method signature - error!
    }
}
