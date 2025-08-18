public class TestApexClass {
    private String testField;
    
    public TestApexClass() {
        this.testField = 'Hello World';
    }
    
    public void testMethod() {
        System.debug('Test method called');
    }
    
    public String getTestField() {
        return this.testField;
    }
    
    public static void staticMethod() {
        System.debug('Static method called');
    }
}