public class ValidContinueInLoop {
    public void testMethod() {
        for (Integer i = 0; i < 10; i++) {
            if (i % 2 == 0) {
                continue; // Valid: continue inside loop
            }
            System.debug(i);
        }
    }
}
