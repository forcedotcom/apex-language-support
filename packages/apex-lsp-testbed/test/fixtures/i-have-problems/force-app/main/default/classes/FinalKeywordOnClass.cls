/**
 * Demonstrates: Invalid use of 'final' keyword on class declaration
 * Error Code: (to be determined - semantic validation error)
 * Validator: ClassModifierValidator
 *
 * In Apex, classes are final by default and cannot use the 'final' keyword.
 * The 'final' keyword can only be used for variables (to prevent reassignment).
 * To make a class extensible, use the 'virtual' keyword instead.
 */
public final class FinalKeywordOnClass {
    public void someMethod() {
    }
}
