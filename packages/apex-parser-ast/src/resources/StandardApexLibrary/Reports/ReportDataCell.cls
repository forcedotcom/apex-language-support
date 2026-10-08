/**
 * Contains the data for a cell in the report, including the display label and value.
 */
global class ReportDataCell {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the localized display name of the value of a specified cell in the report.
     */
    global String getLabel() { return null; }

    /**
     * Returns the value of a specified cell of a detail row of a report.
     */
    global Object getValue() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}