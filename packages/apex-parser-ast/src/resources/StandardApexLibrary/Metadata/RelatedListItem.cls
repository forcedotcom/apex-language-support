/**
 * Represents an item in the related list in a page layout.
 * <p>Usage
 * Use this class when accessing Metadata.Layout metadata components. For more information, see “RelatedListItem” in the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api_meta.meta/api_meta/meta_intro.htm" target="_blank">Metadata API Developer Guide</a>.
 */
global class RelatedListItem extends Metadata.MetadataValue {
    /**
     * A list of custom buttons used in the related list.
     * <p>List<String>
     * For more information, see “Define Custom Buttons and Links” in the Salesforce online help.
     */
    global List customButtons { get; set; }
    /**
     * A list of excluded related-list buttons.
     * <p>List<String>
     */
    global List excludeButtons { get; set; }
    /**
     * A list of fields displayed in the related list. Uses aliases instead of field or API names.
     * <p>List<String>
     */
    global List fields { get; set; }
    /**
     * A list of quick actions used on the related list.
     * <p>List<String>
     */
    global List quickActions { get; set; }
    /**
     * The name of the related list.
     * <p>String
     */
    global String relatedList { get; set; }
    /**
     * The name of the field used for sorting.
     * <p>String
     */
    global String sortField { get; set; }
    /**
     * When sortField is set, the sortOrder property determines the sort order.
     * <p>Metadata.SortOrder
     */
    global Metadata.SortOrder sortOrder { get; set; }

    global RelatedListItem() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}