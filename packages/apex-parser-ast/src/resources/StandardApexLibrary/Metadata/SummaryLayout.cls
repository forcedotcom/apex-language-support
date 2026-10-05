/**
 * Controls the appearance of the highlights panel, which summarizes key fields in a grid at the top of a page layout, when Case Feed is enabled.
 * <p>Usage
 * Use this class when accessing Metadata.Layout metadata components. For more information, see “SummaryLayout” in the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api_meta.meta/api_meta/meta_intro.htm" target="_blank">Metadata API Developer Guide</a>.
 */
global class SummaryLayout extends Metadata.MetadataValue {
    /**
     * The name of the layout label.
     * <p>Important
     * Where possible, we changed noninclusive terms to align with our company value of Equality. We maintained certain terms to avoid any effect on customer implementations.
     * <p>String
     */
    global String masterLabel { get; set; }
    /**
     * Number of columns in the highlights pane, between 1 and 4 (inclusive).
     * <p>Integer
     */
    global Integer sizeX { get; set; }
    /**
     * Number of rows in each column, either 1 or 2.
     * <p>Integer
     */
    global Integer sizeY { get; set; }
    /**
     * If provided, the setting is not visible to users.
     * <p>Integer
     */
    global Integer sizeZ { get; set; }
    /**
     * Controls the appearance of an individual field and its column and row position within the highlights panel grid, when Case Feed is enabled. At least one is required.
     * <p>List<Metadata.SummaryLayoutItem>
     */
    global List summaryLayoutItems { get; set; }
    /**
     * Specifies the panel style.
     * <p>Metadata.SummaryLayoutStyleEnum
     */
    global Metadata.SummaryLayoutStyleEnum summaryLayoutStyle { get; set; }

    global SummaryLayout() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}