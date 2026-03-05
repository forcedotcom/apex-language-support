public class OperatorWithInvalidTypes {
    public void testMethod() {
        Integer intVar = 5;
        String strVar = "hello";
        Boolean boolVar = true;
        Double doubleVar = 1.5;
        
        // Invalid: Integer == String (type mismatch)
        Boolean result1 = intVar == strVar;
        
        // Invalid: String + Integer (non-numeric arithmetic)
        String sum = strVar + intVar;
        
        // Invalid: String & Integer (invalid bitwise)
        Integer bitwise = strVar & intVar;
        
        // Invalid: Double & Integer (invalid bitwise - Double not allowed)
        Integer bitwise2 = doubleVar & intVar;
        
        // Invalid: Ternary with incompatible types
        Integer ternary1 = boolVar ? 1 : "two";
        String ternary2 = boolVar ? "yes" : 10;
    }
}
