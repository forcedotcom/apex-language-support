public class MalformedMultipleMissingBraces {
    public void method() {
        if (true) {
            Integer x = 1;
            // Missing braces: if, method, class
        }
    }
// Missing closing brace for class
