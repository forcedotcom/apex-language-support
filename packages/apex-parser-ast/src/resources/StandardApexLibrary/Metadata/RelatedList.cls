/**
 * Represents related list custom components on the sidebars of the Salesforce console.
 * Usage
 * Use this class when accessing Metadata.Layout metadata components. For more information, see “RelatedList” in the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api_meta.meta/api_meta/meta_intro.htm" target="_blank">Metadata API Developer Guide</a>.
 */
global class RelatedList extends Metadata.MetadataValue {
    /**
     * When set to true, the related list is hidden from detail pages where it appears as a component to prevent duplicate information from showing.
     * Boolean
     */
    global Boolean hideOnDetail { get; set; }
    /**
     * The name of the component as it appears to console users.
     * String
     */
    global String name { get; set; }

    global RelatedList() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}