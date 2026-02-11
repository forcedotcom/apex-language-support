public class InvalidShiftOperators {
    public void testInvalidShiftOperators() {
        String str = 'test';
        Decimal dec = 5.5;
        Integer num = 5;
        
        // Error: Shift operator on non-Integer/Long
        Integer result1 = str << 2;
        Integer result2 = dec >> 1;
        Integer result3 = str >>> 3;
    }
}
