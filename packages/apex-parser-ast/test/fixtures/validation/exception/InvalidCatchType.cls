public class InvalidCatchType {
    public void testMethod() {
        try {
            // some code
        } catch (String e) {
            // Error: Catch variable must be Exception type, not String
        }
    }
}
