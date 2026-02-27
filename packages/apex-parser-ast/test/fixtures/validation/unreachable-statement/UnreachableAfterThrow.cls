public class UnreachableAfterThrow {
    public void testMethod() {
        throw new Exception('Error');
        Integer x = 5; // Unreachable statement
    }
}
