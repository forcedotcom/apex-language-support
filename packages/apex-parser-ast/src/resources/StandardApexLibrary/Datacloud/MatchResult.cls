/**
 * Represents the duplicate results for a matching rule.
 */
global class MatchResult {
    global String entitytype { get; }
    global List errors { get; }
    global String matchengine { get; }
    global List matchrecords { get; }
    global String rule { get; }
    global Integer size { get; }
    global Boolean success { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the entity type of the matching rule.
     */
    global String getEntityType() { return null; }

    /**
     * Returns errors that occurred during matching for the matching rule.
     */
    global List getErrors() { return null; }

    /**
     * Returns the match engine for the matching rule.
     */
    global String getMatchEngine() { return null; }

    /**
     * Returns information about the duplicates for the matching rule.
     */
    global List getMatchRecords() { return null; }

    /**
     * Returns the developer name of the matching rule.
     */
    global String getRule() { return null; }

    /**
     * Returns the number of duplicates detected by the matching rule.
     */
    global Integer getSize() { return 0; }

    global Integer hashCode() { return 0; }

    /**
     * Returns false if there’s an error with the matching rule, and true if the matching rule successfully ran.
     */
    global Boolean isSuccess() { return false; }

    global String toString() { return null; }
}