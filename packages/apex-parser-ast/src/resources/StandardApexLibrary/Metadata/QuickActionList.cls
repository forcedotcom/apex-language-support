/**
 * Represents the list of actions associated with the page layout.
 * <p>Usage
 * Use this class when accessing Metadata.Layout metadata components. For more information, see “QuickActionList” in the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api_meta.meta/api_meta/meta_intro.htm" target="_blank">Metadata API Developer Guide</a>.
 */
global class QuickActionList extends Metadata.MetadataValue {
    /**
     * List of QuickActionList objects.
     * <p>List<Metadata.QuickActionListItem>
     */
    global List quickActionListItems { get; set; }

    global QuickActionList() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}