public class BitwiseOperations {
    public void testInvalidBitwiseOperations() {
        Integer i;
        Double d;
        String s;
        
        // Invalid: Integer & Boolean (Boolean bitwise requires both Boolean)
        i = 1 & true;
        
        // Invalid: Integer | String (bitwise requires Boolean or Integer/Long)
        i = 1 | 'foo';
        
        // Invalid: Double shift operation (Double not allowed in bitwise)
        d = 1.0d << 2;
        
        // Invalid: Integer ^ Double (Double not allowed in bitwise)
        i = 1 ^ 2.0;
        
        // Invalid: Long * Boolean (arithmetic, not bitwise, but related)
        Long l;
        l = 1L * true;
    }
}
