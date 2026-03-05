@isTest
public class TestClass {
    @TestSetup
    public static void setup1() {
    }
    
    @TestSetup
    public static void setup2() { // Error: Only one @TestSetup method per class
    }
}
