@isTest
public class TestSetupWithParams {
    @TestSetup
    public static void setupData(String param) {
        // TestSetup methods cannot have parameters
    }
}
