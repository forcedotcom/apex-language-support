public class ValidStaticContext {
    public static Integer staticField;
    public Integer instanceField;
    public static void staticMethod() {
        staticField = 1;
    }
    public void instanceMethod() {
        instanceField = 1;
    }
}
