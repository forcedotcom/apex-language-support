public class CallerWithInvalidQualifiedAccess {
    public void testMethod() {
        ClassWithFields obj = new ClassWithFields();
        // Wrong: Accessing field that does not exist on ClassWithFields
        // (ClassWithFields has publicField, privateField, protectedField - not nonExistentField)
        String value = obj.nonExistentField;
    }
}
