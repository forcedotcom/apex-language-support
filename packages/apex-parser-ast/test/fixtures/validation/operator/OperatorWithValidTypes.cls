public class OperatorWithValidTypes {
    public void testMethod() {
        Integer intVar = 5;
        Long longVar = 10L;
        String strVar = "hello";
        Boolean boolVar = true;
        
        // Valid: Integer == Integer
        Boolean result1 = intVar == 10;
        
        // Valid: String == String
        Boolean result2 = strVar == "world";
        
        // Valid: Boolean == Boolean
        Boolean result3 = boolVar == true;
        
        // Valid: Integer + Integer
        Integer sum = intVar + 5;
        
        // Valid: Integer & Integer (bitwise)
        Integer bitwise = intVar & 3;
        
        // Valid: Boolean & Boolean (bitwise)
        Boolean boolBitwise = boolVar & true;
        
        // Valid: Ternary with compatible types
        Integer ternary1 = boolVar ? 1 : 2;
        String ternary2 = boolVar ? "yes" : "no";
    }
}
