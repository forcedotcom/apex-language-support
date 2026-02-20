/**
 * Tests GENERIC_PARAMETER_TYPE context - List<NonExistentType> should report INVALID_UNRESOLVED_TYPE
 */
public class GenericUnresolved {
    public List<NonExistentType> field;
    public void method(Map<String, NonExistentType> param) {
    }
}
