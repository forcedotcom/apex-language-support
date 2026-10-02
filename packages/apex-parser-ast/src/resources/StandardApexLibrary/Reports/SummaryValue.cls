/**
 * Contains summary data for a cell of the report.
 */
global class SummaryValue {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the formatted summary data for a specified cell.
     */
    global String getLabel() { return null; }

    /**
     * Returns the numeric value of the summary data for a specified cell.
     */
    global Object getValue() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}