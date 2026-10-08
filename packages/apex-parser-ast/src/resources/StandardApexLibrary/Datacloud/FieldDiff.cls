/**
 * Represents the name of a matching rule field and how the values of the field compare for the duplicate and its matching record.
 */
global class FieldDiff {
    global String difference { get; }
    global String name { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns how the field values compare for the duplicate and its matching record.
     * @return Possible values include:
     * SAME: Indicates the field values match exactly.
     * DIFFERENT: Indicates that the field values do not match.
     * NULL: Indicates that the field values are a match because both values are blank.
     */
    global String getDifference() { return null; }

    /**
     * Returns the name of a field on a matching rule that detected duplicates.
     */
    global String getName() { return null; }

    global Integer hashCode() { return 0; }

    global String toString() { return null; }
}