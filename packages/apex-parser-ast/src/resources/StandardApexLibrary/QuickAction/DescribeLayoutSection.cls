/**
 * Represents a section of a layout and consists of one or more columns and one or more rows (an array of QuickAction.DescribeLayoutRow).
 */
global class DescribeLayoutSection {
    /**
     * The current view of the record details section: collapsed (true) or expanded (false).
     * Boolean
     */
    global Boolean collapsed { get; }
    global Integer columns { get; }
    global String heading { get; }
    global List layoutrows { get; }
    /**
     * The unique ID of the record details section in the layout.
     * Id
     */
    global Id layoutsectionid { get; }
    global Id parentlayoutid { get; }
    global Integer rows { get; }
    global String taborder { get; }
    global Boolean usecollapsiblesection { get; }
    global Boolean useheading { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the number of columns in the QuickAction.DescribeLayoutSection.
     */
    global Integer getColumns() { return 0; }

    /**
     * The heading text (label) for the QuickAction.DescribeLayoutSection.
     */
    global String getHeading() { return null; }

    /**
     * Returns an array of one or more QuickAction.DescribeLayoutRow objects.
     */
    global List getLayoutRows() { return null; }

    /**
     * Returns the ID of the record details section in the layout.
     */
    global Id getLayoutSectionId() { return null; }

    /**
     * Returns the ID of the layout upon which this DescribeLayoutSection resides.
     */
    global Id getParentLayoutId() { return null; }

    /**
     * Returns the number of rows in the QuickAction.DescribeLayoutSection.
     */
    global Integer getRows() { return 0; }

    global String getTabOrder() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Indicates whether the record details section is collapsed (true) or expanded (false). If you build your own app, you can use this method to see whether the current user collapsed a section, and respect that preference in your own UI.
     */
    global Boolean isCollapsed() { return false; }

    /**
     * Indicates whether the QuickAction.DescribeLayoutSection is a collapsible section (true) or not (false).
     */
    global Boolean isUseCollapsibleSection() { return false; }

    /**
     * Indicates whether to use the heading (true) or not (false).
     */
    global Boolean isUseHeading() { return false; }

    global String toString() { return null; }
}