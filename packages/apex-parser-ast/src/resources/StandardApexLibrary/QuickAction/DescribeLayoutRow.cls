/**
 * Represents a row in a QuickAction.DescribeLayoutSection.
 * Usage
 * A QuickAction.DescribeLayoutRow consists of one or more QuickAction.DescribeLayoutItem objects. For each QuickAction.DescribeLayoutRow, a QuickAction.DescribeLayoutItem refers either to a specific field or to an “empty” QuickAction.DescribeLayoutItem (one that contains no QuickAction.DescribeLayoutComponent objects). An empty QuickAction.DescribeLayoutItem can be returned when a given QuickAction.DescribeLayoutRow is sparse (for example, containing more fields on the right column than on the left column).
 */
global class DescribeLayoutRow {
    global List layoutitems { get; }
    global Integer numitems { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns either a specific field or an empty QuickAction.DescribeLayoutItem (one that contains no QuickAction.DescribeLayoutComponent objects).
     */
    global List getLayoutItems() { return null; }

    /**
     * Returns the number of QuickAction.DescribeLayoutItem.
     */
    global Integer getNumItems() { return 0; }

    global Integer hashCode() { return 0; }

    global String toString() { return null; }
}