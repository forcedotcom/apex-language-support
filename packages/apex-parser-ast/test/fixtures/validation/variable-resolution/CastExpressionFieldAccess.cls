public class CastExpressionFieldAccess {
    public class Wrapper {
        public String value;
    }

    public void testCastFieldAccess() {
        Object obj = new Wrapper();
        String result = ((Wrapper) obj).value;
    }
}
