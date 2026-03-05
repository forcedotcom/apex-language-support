@isTest
public class TestSetupNonVoid {
    @TestSetup
    public static String setupData() {
        return 'data'; // TestSetup methods must return void
    }
}
