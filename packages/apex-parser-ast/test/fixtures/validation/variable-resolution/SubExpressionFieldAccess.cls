public class SubExpressionFieldAccess {
    public class Wrapper {
        public String value;
    }

    public void testSubExpressionFieldAccess() {
        Wrapper obj = new Wrapper();
        String result = (obj).value;
    }
}
