public class BreakInNestedLoop {
    public void testMethod() {
        for (Integer i = 0; i < 5; i++) {
            for (Integer j = 0; j < 5; j++) {
                if (j == 2) {
                    break; // Valid: break in nested loop
                }
            }
        }
    }
}
