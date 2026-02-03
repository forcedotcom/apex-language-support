/**
 * Demonstrates: Duplicate variable (parameter and local variable in same scope)
 * Error Code: duplicate.variable
 * Validator: DuplicateSymbolValidator (TIER 1)
 * 
 * Note: This is a same-scope duplicate (variable and parameter in same method),
 * which is detected as an ERROR by DuplicateSymbolValidator.
 * Cross-scope shadowing (e.g., local variable shadowing class field) is handled
 * by VariableShadowingValidator as a WARNING.
 */
public class DuplicateVariable {
    public void myMethod(String param1) {
        String param1 = 'duplicate'; // Duplicate variable - error!
    }
}
