/**
 * Contains information about the divisions that can be used to filter a report.
 * Usage
 * Use to filter records in the report based on a division, like West Coast and East Coast.
 */
global class ReportDivisionInfo {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the default division for the report.
     */
    global String getDefaultValue() { return null; }

    /**
     * Returns a list of all possible divisions for the report.
     */
    global List getValues() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}