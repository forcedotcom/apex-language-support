public class CallerWithIncorrectReturnTypes {
    public void testMethod() {
        MethodWithReturnType obj = new MethodWithReturnType();
        
        // Incorrect: String method assigned to Integer variable
        Integer num = obj.getString();
        
        // Incorrect: Integer method assigned to String variable
        String str = obj.getInteger();
        
        // Incorrect: Boolean method assigned to String variable
        String flag = obj.getBoolean();
    }
}
