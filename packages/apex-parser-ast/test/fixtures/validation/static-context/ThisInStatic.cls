public class ThisInStatic {
    public String field;
    public static void staticMethod() {
        this.field = 'value';
    }
}
