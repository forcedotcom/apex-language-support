public class InvalidListInitializer {
    public void testCollections() {
        // Invalid: List initializer should be Integer or List<String>, not a string literal
        // The literal is classified by the parser; no source-text inference is needed.
        List<String> list1 = new List<String>('test');
    }
}
