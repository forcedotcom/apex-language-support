/**
 * Represents an individual item in a QuickAction.DescribeLayoutRow.
 * Usage
 * For most fields on a layout, there is only one component per layout item. However, in a display-only view, the QuickAction.DescribeLayoutItem might be a composite of the individual fields (for example, an address can consist of street, city, state, country, and postal code data). On the corresponding edit view, each component of the address field would be split up into separate QuickAction.DescribeLayoutItems.
 */
global class DescribeLayoutItem {
    global Boolean editablefornew { get; }
    global Boolean editableforupdate { get; }
    global String label { get; }
    global List layoutcomponents { get; }
    global Boolean placeholder { get; }
    global Boolean required { get; }
    global String uibehavior { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the label text for this item.
     */
    global String getLabel() { return null; }

    /**
     * Returns a list of QuickAction.DescribeLayoutComponents for this item.
     */
    global List getLayoutComponents() { return null; }

    global String getUiBehavior() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Indicates whether this item can be edited for new (true) or not (false).
     */
    global Boolean isEditableForNew() { return false; }

    /**
     * Indicates whether this item can be edited for update(true) or not (false).
     */
    global Boolean isEditableForUpdate() { return false; }

    /**
     * Indicates whether this item is a placeholder (true) or not (false). If true, then this item is blank.
     */
    global Boolean isPlaceholder() { return false; }

    /**
     * Indicates whether this item is required (true) or not (false).
     * Usage
     * This is useful if, for example, you want to render required fields in a contrasting color.
     */
    global Boolean isRequired() { return false; }

    global String toString() { return null; }
}