public class InvalidExactEquality {
    public void testInvalidExactEquality() {
        Integer num1 = 5;
        Integer num2 = 10;
        String str1 = 'test';
        String str2 = 'test';
        
        // Error: Exact equality on primitive types
        Boolean result1 = num1 === num2;
        Boolean result2 = str1 === str2;
    }
}
