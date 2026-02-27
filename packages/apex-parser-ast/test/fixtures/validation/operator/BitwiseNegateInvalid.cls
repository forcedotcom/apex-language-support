public class BitwiseNegateInvalid {
    public void testInvalidBitwiseNegate() {
        String str = 'test';
        Decimal dec = 123.45;
        Boolean bool = true;
        
        // Invalid: bitwise negate on String
        Integer result1 = ~str;
        
        // Invalid: bitwise negate on Decimal
        Integer result2 = ~dec;
        
        // Invalid: bitwise negate on Boolean
        Integer result3 = ~bool;
        
        // Valid: bitwise negate on Integer
        Integer valid1 = ~123;
        
        // Valid: bitwise negate on Long
        Long valid2 = ~123L;
    }
}
