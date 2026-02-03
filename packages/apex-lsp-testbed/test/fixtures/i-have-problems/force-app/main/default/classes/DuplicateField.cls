/**
 * Demonstrates: Duplicate field names
 * Error Code: duplicate.field
 * Validator: DuplicateFieldValidator (TIER 1)
 */
public class DuplicateField {
    public String myField;
    public Integer myField; // Duplicate field name - error!
}
