public class InvalidLogicalOperators {
    public void testInvalidLogicalOperators() {
        String str = 'test';
        Integer num = 5;
        
        // Error: Logical operators on non-boolean
        Boolean result1 = str && true;
        Boolean result2 = num || false;
    }
}
