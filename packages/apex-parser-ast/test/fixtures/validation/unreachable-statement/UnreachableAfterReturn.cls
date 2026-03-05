public class UnreachableAfterReturn {
    public void testMethod() {
        return;
        Integer x = 5; // Unreachable statement
    }
}
