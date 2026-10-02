/**
 * Contains the individual components of an evaluated condition for a report notification, such as the aggregate name and label, the operator, and the value that the aggregate is compared to.
 */
global class EvaluatedCondition {
    /**
     * Creates a new instance of the Reports.EvaluatedConditions class using the specified parameters.
     */
    global Object EvaluatedCondition(String aggregateName, String aggregateLabel, Double compareTo, Double value, String displayCompareTo, String displayValue, reports.EvaluatedConditionOperator operator) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the localized display name of the aggregate.
     */
    global String getAggregateLabel() { return null; }

    /**
     * Returns the unique API name of the aggregate.
     */
    global String getAggregateName() { return null; }

    /**
     * Returns the value that the aggregate is compared to in the condition.
     */
    global Double getCompareTo() { return 0.0; }

    /**
     * Returns the value that the aggregate is compared to in the condition, formatted for display. For example, a display value for a currency is $20.00 or USD20.00 instead of 20.00.
     */
    global String getDisplayCompareTo() { return null; }

    /**
     * Returns the value of the aggregate when the report is run, formatted for display. For example, a display value for a currency is $20.00 or USD20.00 instead of 20.00.
     */
    global String getDisplayValue() { return null; }

    /**
     * Returns the operator used in the condition.
     */
    global reports.EvaluatedConditionOperator getOperator() { return null; }

    /**
     * Returns the actual value of the aggregate when the report is run.
     */
    global Double getValue() { return 0.0; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}