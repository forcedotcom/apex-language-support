public class InstanceVariableInConstructor {
    private String value = 'test';
    
    public InstanceVariableInConstructor() {
        // Error: Cannot reference instance variables in constructor invocation
        super(value);
    }
}
