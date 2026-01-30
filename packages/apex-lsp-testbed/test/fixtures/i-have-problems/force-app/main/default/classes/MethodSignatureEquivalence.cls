/**
 * Demonstrates: Duplicate method signatures (different return types)
 * Error Code: method.already.exists
 * Validator: MethodSignatureEquivalenceValidator (TIER 2)
 * 
 * Note: This validator checks for methods with equivalent signatures
 * (same name, same parameter types) even if return types differ.
 */
public class MethodSignatureEquivalence {
    public String process(String input) {
        return input;
    }
    
    public Integer process(String input) {
        // Same method name and parameter type, but different return type
        // This creates an ambiguous method signature - error!
        return 0;
    }
}
