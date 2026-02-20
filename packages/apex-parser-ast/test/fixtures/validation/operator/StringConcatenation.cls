public class StringConcatenation {
    public void testStringConcatenation() {
        // String + String literal
        String s = 'Hello';
        String t = s + ' World';
        
        // String + Integer (concatenation)
        String u = s + 123;
        
        // Integer + Integer (addition)
        Integer i = 1;
        Integer j = i + 1;
        
        // String literal + Integer (concatenation)
        String v = 'The value of j is: ' + j;
        
        // String literal + String literal
        String w = 'Hello' + ' World';
        
        // String + String variable
        String x = s + t;
    }
}
