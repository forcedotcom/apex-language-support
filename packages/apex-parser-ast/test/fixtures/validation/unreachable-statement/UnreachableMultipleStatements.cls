public class UnreachableMultipleStatements {
    public void testMethod() {
        return;
        Integer x = 5; // Unreachable
        String y = 'test'; // Unreachable
        System.debug('Never reached'); // Unreachable
    }
}
