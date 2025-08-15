public class StdApex {
    public static void myDebug(String message) {
        System.debug(message);
        Assert.isNotNull(message);
    }
}