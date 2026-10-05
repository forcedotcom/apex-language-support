/**
 * Controls the appearance of an individual field and its column and row position within the highlights panel grid, when Case Feed is enabled. You can have two fields per each grid in a highlights panel.
 * <p>Usage
 * Use this class when accessing Metadata.Layout metadata components. For more information, see “SummaryLayoutItem” in the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api_meta.meta/api_meta/meta_intro.htm" target="_blank">Metadata API Developer Guide</a>.
 */
global class SummaryLayoutItem extends Metadata.MetadataValue {
    /**
     * The custom link reference.
     * <p>String
     */
    global String customLink { get; set; }
    /**
     * The field name reference, relative to the page layout. Must be a standard or custom field that also exists on the detail page.
     * <p>String
     */
    global String field { get; set; }
    /**
     * The item's column position in the highlights panel grid. Must be within the range of sizeX.
     * <p>Integer
     */
    global Integer posX { get; set; }
    /**
     * The item's row position in the highlights panel grid. Must be within the range of sizeY.
     * <p>Integer
     */
    global Integer posY { get; set; }
    /**
     * Reserved for future use. If provided, the setting is not visible to users.
     * <p>Integer
     */
    global Integer posZ { get; set; }

    global SummaryLayoutItem() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}