public class InvalidCastExpressions {
    public void testInvalidCastExpressions() {
        String str = 'test';
        Integer num = 5;
        
        // Error: Incompatible cast types
        Integer result1 = (Integer)str;
        
        // Error: Invalid cast type (void)
        // Note: This may not be testable without method return types
    }
}
