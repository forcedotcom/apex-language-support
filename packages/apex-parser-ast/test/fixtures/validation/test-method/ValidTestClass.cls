@isTest
public class ValidTestClass {
    @isTest
    public static void testMethod() {
        // Valid: no parameters
    }
    
    @TestSetup
    public static void setupData() {
        // Valid: no parameters, returns void
    }
}
