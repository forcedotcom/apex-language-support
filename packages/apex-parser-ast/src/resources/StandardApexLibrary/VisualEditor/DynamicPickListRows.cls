/**
 * Contains a list of picklist items in a Lightning component on a Lightning page.
 */
global class DynamicPickListRows {
    /**
     * Creates an instance of the VisualEditor.DynamicPickListRows class. You can then add rows by using the class’s addRow or addAllRows methods.
     */
    global DynamicPickListRows() { }

    /**
     * Creates an instance of the VisualEditor.DynamicPickListRows class using the specified parameter.
     */
    global DynamicPickListRows(List rows) { }

    /**
     * Creates an instance of the VisualEditor.DynamicPickListRows class using the specified parameters.
     */
    global DynamicPickListRows(List rows, Boolean containsAllRows) { }

    /**
     * Adds a list of picklist items to a dynamic picklist rendered in a Lightning component on a Lightning page.
     */
    global void addAllRows(List rows) { }

    /**
     * Adds a single picklist item to a dynamic picklist rendered in a Lightning component on a Lightning page.
     */
    global void addRow(VisualEditor.DataRow row) { }

    /**
     * Returns a Boolean value indicating whether all values of the picklist are included when a user does a type-ahead search query (true) or only those values initially displayed when the list is clicked on (false).
     * @return A picklist in a Lightning component can display only the first 200 values of a list. If containsAllRows is set to false, when a user does a type-ahead search to find values in the picklist, the search will only look at those first 200 values that were displayed, not the complete set of picklist values.
     */
    global Boolean containsAllRows() { return false; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns a picklist element stored at the specified index.
     */
    global VisualEditor.DataRow get(Integer i) { return null; }

    /**
     * Returns a list of picklist items.
     */
    global List getDataRows() { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the value indicating whether all values of the picklist are included when a user does a type-ahead search query (true) or only those values initially displayed when the list is clicked on (false).
     */
    global void setContainsAllRows(Boolean containsAllRows) { }

    /**
     * Returns the size of the list of VisualEditor.DynamicPickListRows.
     */
    global Integer size() { return 0; }

    /**
     * Sorts the list of VisualEditor.DynamicPickListRows.
     */
    global void sort() { }

    global override virtual String toString() { return null; }
}