public class CallerWithIncorrectTypes {
    public void testMethod() {
        ClassWithTypedMethods obj = new ClassWithTypedMethods();
        
        // Wrong: String literal when method expects Integer
        obj.methodWithInteger("hello");
        
        // Wrong: Integer literal when method expects String
        obj.methodWithString(42);
        
        // Wrong: Boolean literal when method expects String
        obj.methodWithBoolean("true");
        
        // Wrong: Swapped argument types
        obj.methodWithTwoParams(123, "test");
    }
}
