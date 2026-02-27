public class MultipleTryStatements {
    public void testMethod() {
        try {
            Integer x = 1;
        } catch (Exception e) {
            System.debug('Error: ' + e.getMessage());
        }
        
        try {
            Integer y = 2;
        }
    }
}
