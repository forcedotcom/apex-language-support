public class InvalidArithmetic {
    public void testOperators() {
        // Invalid: arithmetic on string literals (except + for concatenation)
        Integer result = 'hello' * 'world';
    }
}
