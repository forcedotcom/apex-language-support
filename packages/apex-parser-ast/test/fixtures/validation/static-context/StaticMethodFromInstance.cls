public class StaticMethodFromInstance {
    public static void staticMethod() {
    }
    public void instanceMethod() {
        this.staticMethod();
    }
}
