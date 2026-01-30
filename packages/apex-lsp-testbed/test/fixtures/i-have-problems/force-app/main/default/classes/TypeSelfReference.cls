/**
 * Demonstrates: Class extends itself (self-reference)
 * Error Code: circular.definition
 * Validator: TypeSelfReferenceValidator (TIER 1)
 */
public class TypeSelfReference extends TypeSelfReference {
    // Class extends itself - error!
}
