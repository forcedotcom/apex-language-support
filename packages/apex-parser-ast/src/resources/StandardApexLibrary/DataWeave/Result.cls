/**
 * Contains methods to retrieve data that was transformed using Script class methods.
 * Example
 * See Script Class for an example to run a DataWeave script from Apex and retrieve the resulting script output.
 */
@JsonAccess
global class Result {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the result of a DataWeave script execution as an object.
     */
    global Object getValue() { return null; }

    /**
     * Returns the result of a DataWeave script execution as a string value.
     */
    global String getValueAsString() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override String toString() { return null; }
}