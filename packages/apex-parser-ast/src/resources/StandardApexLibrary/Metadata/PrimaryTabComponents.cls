/**
 * Represents custom console components on primary tabs in the Salesforce console.
 * Usage
 * Use this class when accessing Metadata.Layout metadata components. For more information, see “PrimaryTabComponents” in the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api_meta.meta/api_meta/meta_intro.htm" target="_blank">Metadata API Developer Guide</a>.
 */
global class PrimaryTabComponents extends Metadata.MetadataValue {
    /**
     * Represents a custom console component (Visualforce page, lookup field, or related lists) on a section of a page layout.
     * List<Metadata.ConsoleComponent>
     */
    global List component { get; set; }
    /**
     * Represents a location and style in which to display more than one custom console component on the sidebars of the Salesforce console.
     * List<Metadata.Container>
     */
    global List containers { get; set; }

    global PrimaryTabComponents() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}