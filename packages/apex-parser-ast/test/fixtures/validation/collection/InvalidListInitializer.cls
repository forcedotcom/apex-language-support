public class InvalidListInitializer {
    public void testCollections() {
        // Invalid: List initializer should be Integer or List<String>, not a string literal
        // Note: This tests the validator's pattern matching for invalid types
        List<String> list1 = new List<String>('test');
    }
}
