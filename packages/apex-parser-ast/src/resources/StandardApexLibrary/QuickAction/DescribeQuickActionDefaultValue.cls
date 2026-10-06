/**
 * Returns a default value for a quick action.
 * Usage
 * Represents the default values of fields to use in default layouts.
 */
global class DescribeQuickActionDefaultValue {
    global String defaultvalue { get; }
    global String field { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the default value of the quick action.
     */
    global String getDefaultValue() { return null; }

    /**
     * Returns the field name of the action.
     */
    global String getField() { return null; }

    global Integer hashCode() { return 0; }

    global String toString() { return null; }
}