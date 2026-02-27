public class TryWithFinally {
    public void testMethod() {
        try {
            Integer x = 1;
        } finally {
            System.debug('Cleanup');
        }
    }
}
