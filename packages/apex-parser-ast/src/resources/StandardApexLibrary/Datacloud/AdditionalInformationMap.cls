/**
 * Represents other information, if any, about matched records.
 */
global class AdditionalInformationMap {
    global String name { get; }
    global String value { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the element name.
     */
    global String getName() { return null; }

    /**
     * Returns the value of the element.
     */
    global String getValue() { return null; }

    global Integer hashCode() { return 0; }

    global String toString() { return null; }
}