public class InvalidExpressionStatement {
    public void method() {
        1 + 2; // Error: expression used as statement
        Integer x = 5;
        Integer y = 10;
        x == y; // Error: comparison used as statement
    }
}
