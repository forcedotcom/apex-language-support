/**
 * Contains information about one item in a picklist used in a Lightning component on a Lightning page.
 */
global class DataRow {
    /**
     * Creates an instance of the VisualEditor.DataRow class using the specified label and value.
     */
    global DataRow(String label, Object value) { }

    /**
     * Creates an instance of the VisualEditor.DataRow class using the specified label, value, and selected option.
     */
    global DataRow(String label, Object value, Boolean selected) { }

    /**
     * Compares the current VisualEditor.DataRow object to the specified one. Returns an integer value that is the result of the comparison.
     * @return Returns one of the following values:
     * Zero if the current package version is equal to the specified package version
     * An integer value greater than zero if the current package version is greater than the specified package version
     * An integer value less than zero if the current package version is less than the specified package version
     */
    global Integer compareTo(VisualEditor.DataRow o) { return 0; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the user-facing label of the picklist item.
     */
    global String getLabel() { return null; }

    /**
     * Returns the value of the picklist item.
     */
    global Object getValue() { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Returns the state of the picklist item, indicating whether it’s selected or not.
     */
    global Boolean isSelected() { return false; }

    global override virtual String toString() { return null; }
}