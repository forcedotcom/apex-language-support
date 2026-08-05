public class CallerWithCorrectReturnTypes {
    public void testMethod() {
        MethodWithReturnType obj = new MethodWithReturnType();
        
        // Correct: String method assigned to String variable
        String str = obj.getString();
        
        // Correct: Integer method assigned to Integer variable
        Integer num = obj.getInteger();
        
        // Correct: Boolean method assigned to Boolean variable
        Boolean flag = obj.getBoolean();

        // Apex method-return compatibility is broader than simple widening.
        String idAsString = obj.getId();
        Id stringAsId = obj.getString();
        Integer numeric = obj.getDecimal();
        MethodWithReturnType typedObject = obj.getObject();
    }
}
