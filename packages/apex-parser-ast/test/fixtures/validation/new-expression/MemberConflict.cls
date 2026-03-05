public class MemberConflict {
    public void Inner() {
    }
    public class Inner {
    }
    public void method() {
        Object x = new MemberConflict.Inner();
    }
}
