/**
 * Contains a list of evaluated conditions for a report notification.
 */
global class ThresholdInformation {
    /**
     * Creates a new instance of the Reports.EvaluatedCondition class.
     */
    global ThresholdInformation(List evaluatedConditions) { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns a list of evaluated conditions for a report notification.
     */
    global List getEvaluatedConditions() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}