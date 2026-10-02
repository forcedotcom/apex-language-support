/**
 * Represents custom console components (Visualforce pages, lookup fields, or related lists) on a page layout.
 * <p>Usage
 * Use this class when accessing Metadata.Layout metadata components. For more information, see “CustomConsoleComponents” in the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api_meta.meta/api_meta/meta_intro.htm" target="_blank">Metadata API Developer Guide</a>.
 */
global class CustomConsoleComponents extends Metadata.MetadataValue {
    /**
     * Represents custom console components on primary tabs in the Salesforce console.
     * <p>Metadata.PrimaryTabComponents
     */
    global Metadata.PrimaryTabComponents primaryTabComponents { get; set; }
    /**
     * Represents custom console components on subtabs in the Salesforce console.
     * <p>Metadata.SubtabComponents
     */
    global Metadata.SubtabComponents subtabComponents { get; set; }

    global Object CustomConsoleComponents() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}