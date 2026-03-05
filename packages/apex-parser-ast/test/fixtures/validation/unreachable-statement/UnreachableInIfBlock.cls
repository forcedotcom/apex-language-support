public class UnreachableInIfBlock {
    public void testMethod() {
        if (true) {
            return;
            Integer x = 5; // Unreachable in if block
        }
        Integer y = 10; // This is reachable (after if block)
    }
}
