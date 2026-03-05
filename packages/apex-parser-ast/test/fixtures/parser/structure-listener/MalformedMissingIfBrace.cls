public class MalformedMissingIfBrace {
    public void method() {
        if (true) {
            Integer x = 1;
        // Missing closing brace for if - next } closes method
    }
}
