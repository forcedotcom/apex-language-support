public class ValidCatch {
    public void testMethod() {
        try {
            // some code
        } catch (Exception e) {
            // Valid: Exception type
        } catch (NullPointerException e) {
            // Valid: NullPointerException extends Exception
        }
    }
}
