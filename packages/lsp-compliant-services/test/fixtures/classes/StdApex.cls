public class StdApex {
    public static void debug(String message) {
        System.debug(message);
        Assert.isNotNull(message);
    }
}