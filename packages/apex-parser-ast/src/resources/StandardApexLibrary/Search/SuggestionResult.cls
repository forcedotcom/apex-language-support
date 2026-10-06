/**
 * A wrapper object that contains an sObject.
 */
global class SuggestionResult {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the sObject from a SuggestionResult object.
     */
    global SObject getSObject() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}