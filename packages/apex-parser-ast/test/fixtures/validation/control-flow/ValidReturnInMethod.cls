public class ValidReturnInMethod {
    public void voidMethod() {
        return; // Valid: return in void method
    }
    
    public Integer intMethod() {
        return 42; // Valid: return in method with return type
    }
    
    public ValidReturnInMethod() {
        return; // Valid: return in constructor
    }
}
