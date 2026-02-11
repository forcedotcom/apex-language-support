public class ClassWithTypedThisCalls {
    public ClassWithTypedThisCalls() {
    }
    
    public ClassWithTypedThisCalls(String name) {
    }
    
    public ClassWithTypedThisCalls(Integer count) {
    }
    
    public ClassWithTypedThisCalls(String name, Integer count) {
        // Correct: calling this() with matching types
        this(name);
    }
    
    public ClassWithTypedThisCalls(String name, Integer count, Boolean flag) {
        // Wrong: calling this() with Boolean when no matching constructor exists
        // There is no constructor that takes only a Boolean parameter
        this(true);
    }
}
