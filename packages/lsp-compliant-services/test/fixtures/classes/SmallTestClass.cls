public class SmallTestClass {
    // Small complexity: Common primitives + System.debug
    // Expected first open: ~60-80ms (4 stdlib classes: String, Integer, Boolean, System)
    
    private String name;
    private Integer count;
    private Boolean active;
    
    public void log() {
        System.debug(name + ': ' + count);
    }
}
