public class LocalConflict {
    public class Inner {
    }
    public void method() {
        Integer Inner = 1;
        Object x = new LocalConflict.Inner();
    }
}
