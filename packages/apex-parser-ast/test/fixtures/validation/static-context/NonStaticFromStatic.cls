public class NonStaticFromStatic {
    public void instanceMethod() {
    }
    public static void staticMethod() {
        instanceMethod();
    }
}
