public class TryWithCatchAndFinally {
    public void testMethod() {
        try {
            Integer x = 1;
        } catch (Exception e) {
            System.debug('Error: ' + e.getMessage());
        } finally {
            System.debug('Cleanup');
        }
    }
}
