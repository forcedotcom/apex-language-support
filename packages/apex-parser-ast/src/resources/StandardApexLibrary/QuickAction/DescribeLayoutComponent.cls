/**
 * Represents the smallest unit in a layout—a field or a separator.
 */
global class DescribeLayoutComponent {
    global Integer displaylines { get; }
    global Integer taborder { get; }
    global String type { get; }
    global String value { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the vertical lines displayed for a field. Applies to textarea and multi-select picklist fields.
     */
    global Integer getDisplayLines() { return 0; }

    /**
     * Returns the tab order for the item in the row.
     */
    global Integer getTabOrder() { return 0; }

    /**
     * Returns the name of the QuickAction.DescribeLayoutComponent type for this component.
     */
    global String getType() { return null; }

    /**
     * Returns the name of the field if the type for QuickAction.DescribeLayoutComponent is textarea.
     */
    global String getValue() { return null; }

    global Integer hashCode() { return 0; }

    global String toString() { return null; }
}