public class InvalidUnaryOperators {
    public void testInvalidUnaryOperators() {
        String str = 'test';
        Integer num = 5;
        Boolean bool = true;
        
        // Error: Boolean prefix operator (!) on non-boolean
        Boolean result1 = !str;
        
        // Error: Unary negation (-) on non-numeric
        Integer result2 = -str;
        
        // Error: Postfix increment on non-numeric
        str++;
        
        // Error: Prefix decrement on non-numeric
        --str;
        
        // Error: Prefix increment on non-numeric
        ++str;
    }
}
