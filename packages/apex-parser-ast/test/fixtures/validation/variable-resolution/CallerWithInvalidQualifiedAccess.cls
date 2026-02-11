public class CallerWithInvalidQualifiedAccess {
    public void testMethod() {
        String str = "hello";
        Integer num = 42;
        
        // Wrong: Accessing field on String (no such field)
        String value = str.nonExistentField;
        
        // Wrong: Accessing field on Integer (no such field)
        Integer count = num.anotherField;
        
        // Wrong: Accessing private field from outside class
        ClassWithFields obj = new ClassWithFields();
        String privateValue = obj.privateField;
    }
}
