public class ValidBreakInLoop {
    public void testMethod() {
        for (Integer i = 0; i < 10; i++) {
            if (i == 5) {
                break; // Valid: break inside loop
            }
        }
    }
}
