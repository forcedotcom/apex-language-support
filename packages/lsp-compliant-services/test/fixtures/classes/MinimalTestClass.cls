public class MinimalTestClass {
    // Minimal complexity: String only
    // Expected first open: ~40-60ms (1 stdlib class: String)
    
    public String getName() {
        return String.isBlank('test') ? '' : 'test';
    }
}
