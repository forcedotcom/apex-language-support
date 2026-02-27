public class CallerWithQualifiedAccess {
    public void testMethod() {
        ClassWithFields obj = new ClassWithFields();
        
        // Correct: Accessing public field on object instance
        String value = obj.publicField;
        
        // This should work - accessing field on object of correct type
        obj.publicField = "test";
    }
}
