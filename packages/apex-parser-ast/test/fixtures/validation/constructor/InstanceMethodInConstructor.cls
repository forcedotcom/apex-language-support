public class InstanceMethodInConstructor {
    public InstanceMethodInConstructor() {
        // Error: Cannot reference instance methods in constructor invocation
        super(getValue());
    }
    
    private String getValue() {
        return 'test';
    }
}
