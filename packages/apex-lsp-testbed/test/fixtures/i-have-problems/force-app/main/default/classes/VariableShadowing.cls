/**
 * Demonstrates: Variable shadows parameter
 * Error Code: duplicate.variable
 * Validator: VariableShadowingValidator (TIER 1)
 */
public class VariableShadowing {
    public void myMethod(String param1) {
        String param1 = 'shadow'; // Variable shadows parameter - error!
    }
}
