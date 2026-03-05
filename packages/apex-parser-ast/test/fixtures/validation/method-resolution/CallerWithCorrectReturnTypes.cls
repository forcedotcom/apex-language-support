public class CallerWithCorrectReturnTypes {
    public void testMethod() {
        MethodWithReturnType obj = new MethodWithReturnType();
        
        // Correct: String method assigned to String variable
        String str = obj.getString();
        
        // Correct: Integer method assigned to Integer variable
        Integer num = obj.getInteger();
        
        // Correct: Boolean method assigned to Boolean variable
        Boolean flag = obj.getBoolean();
    }
}
