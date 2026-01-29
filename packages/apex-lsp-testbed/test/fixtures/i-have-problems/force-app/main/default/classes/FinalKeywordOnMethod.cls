/**
 * Demonstrates: Invalid use of 'final' keyword on method declaration
 * Error Code: (to be determined - semantic validation error)
 * Validator: MethodModifierValidator
 *
 * In Apex, methods are final by default and cannot use the 'final' keyword.
 * The 'final' keyword can only be used for variables (to prevent reassignment).
 * To make a method overridable, use the 'virtual' keyword instead.
 */
public class FinalKeywordOnMethod {
    public final void someMethod() {
        // Invalid: 'final' keyword cannot be used on methods
    }
}
