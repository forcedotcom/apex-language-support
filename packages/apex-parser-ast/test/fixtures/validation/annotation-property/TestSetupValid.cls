public class TestSetupValid {
    @TestSetup
    public static void setup() {
    }

    @TestSetup(onInstall=true)
    public static void setup2() {
    }
}
