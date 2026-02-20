public class DuplicateCatchException {
    public void testMethod() {
        try {
            // some code
        } catch (Exception e1) {
        } catch (Exception e2) {
            // Error: Exception type already caught
        }
    }
}
