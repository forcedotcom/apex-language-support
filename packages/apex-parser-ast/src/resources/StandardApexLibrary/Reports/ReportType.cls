/**
 * Contains the unique API name and display name for the report type.
 */
global class ReportType {
    global Object ReportType() { return null; }

    global Object ReportType(String type, String label) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the localized display name of the report type.
     */
    global String getLabel() { return null; }

    /**
     * Returns the unique identifier of the report type.
     */
    global String getType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setLabel(String label) { }

    global void setType(String type) { }

    global override virtual String toString() { return null; }
}