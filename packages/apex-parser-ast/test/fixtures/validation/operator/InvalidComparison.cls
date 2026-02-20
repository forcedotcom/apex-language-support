public class InvalidComparison {
    public void testOperators() {
        // Invalid: comparing numeric literal with string literal
        Boolean result = 5 == 'test';
    }
}
