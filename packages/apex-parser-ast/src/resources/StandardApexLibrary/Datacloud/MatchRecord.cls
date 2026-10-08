/**
 * Represents a duplicate record detected by a matching rule.
 */
global class MatchRecord {
    global List additionalinformation { get; }
    global List fielddiffs { get; }
    global Double matchconfidence { get; }
    global SObject record { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns other information about a matched record. For example, a matchGrade represents the quality of the data for the D&B fields in the matched record.
     */
    global List getAdditionalInformation() { return null; }

    /**
     * Returns all matching rule fields and how each field value compares for the duplicate and its matching record.
     */
    global List getFieldDiffs() { return null; }

    /**
     * Returns the ranking of how similar a matched record’s data is to the data in your request. Must be equal to or greater than the value of the minMatchConfidence specified in your request. Returns -1 if unused.
     */
    global Double getMatchConfidence() { return 0.0; }

    /**
     * Returns the fields and field values for the duplicate.
     */
    global SObject getRecord() { return null; }

    global Integer hashCode() { return 0; }

    global String toString() { return null; }
}