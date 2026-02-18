public class MethodCallWithSameNameVariable {
    public void helper() {}
    public void test() {
        Integer helper = 1;
        helper();
    }
}
