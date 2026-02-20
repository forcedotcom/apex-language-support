public class BooleanArithmetic {
    public void testInvalidBooleanArithmetic() {
        Integer i;
        Long l;
        Decimal d;
        
        // Invalid: Integer + Boolean
        i = 1 + true;
        
        // Invalid: Long * Boolean
        l = 1L * true;
        
        // Invalid: Integer / Boolean
        i = 1 / true;
        
        // Invalid: Decimal - Boolean (via string literal)
        d = 1.0 - 'true';
    }
}
