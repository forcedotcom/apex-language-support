/**
 * Represents the items in a column within a layout section.
 * Usage
 * Use this class when accessing Metadata.Layout metadata components. For more information, see “LayoutColumn” in the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api_meta.meta/api_meta/meta_intro.htm" target="_blank">Metadata API Developer Guide</a>.
 */
global class LayoutColumn extends Metadata.MetadataValue {
    /**
     * The individual items within a column (ordered from top to bottom).
     * List<Metadata.LayoutItem>
     */
    global List layoutItems { get; set; }
    /**
     * This field is reserved for Salesforce.
     * String
     */
    global String reserved { get; set; }

    global LayoutColumn() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}