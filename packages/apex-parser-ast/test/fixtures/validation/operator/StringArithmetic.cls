public class StringArithmetic {
    public void testInvalidStringArithmetic() {
        String s;
        
        // Invalid: String - String (subtraction not allowed)
        s = 'ab' - 'cd';
        
        // Invalid: String / String (division not allowed)
        s = 'ab' / 'cd';
        
        // Invalid: String * String (multiplication not allowed, but we already test this)
        s = 'ab' * 'cd';
    }
}
