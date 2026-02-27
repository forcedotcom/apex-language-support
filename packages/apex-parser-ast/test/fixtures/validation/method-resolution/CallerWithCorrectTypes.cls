public class CallerWithCorrectTypes {
    public void testMethod() {
        ClassWithTypedMethods obj = new ClassWithTypedMethods();
        
        // Correct: String literal matches String parameter
        obj.methodWithString("hello");
        
        // Correct: Integer literal matches Integer parameter
        obj.methodWithInteger(42);
        
        // Correct: Boolean literal matches Boolean parameter
        obj.methodWithBoolean(true);
        
        // Correct: Two parameters with correct types
        obj.methodWithTwoParams("test", 123);
        
        // Correct: null is compatible with any object type
        obj.methodWithString(null);
    }
}
