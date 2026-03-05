public class NestedTryStatements {
    public void testMethod() {
        try {
            try {
                Integer x = 1;
            }
        } catch (Exception e) {
            System.debug('Error: ' + e.getMessage());
        }
    }
}
