/**
 * Demonstrates: Variable used before declaration (forward reference)
 * Error Code: illegal.forward.reference
 * Validator: ForwardReferenceValidator (TIER 1)
 */
public class ForwardReference {
    public void myMethod() {
        Integer y = x; // Using x before it's declared - error!
        Integer x = 5;
    }
}
