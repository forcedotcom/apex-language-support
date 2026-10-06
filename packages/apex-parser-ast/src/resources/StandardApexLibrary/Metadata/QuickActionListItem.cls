/**
 * Represents an action in the QuickActionList.
 * Usage
 * Use this class when accessing Metadata.Layout metadata components. For more information, see “QuickActionListItem” in the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api_meta.meta/api_meta/meta_intro.htm" target="_blank">Metadata API Developer Guide</a>.
 */
global class QuickActionListItem extends Metadata.MetadataValue {
    /**
     * The API name of the action.
     * String
     */
    global String quickActionName { get; set; }

    global QuickActionListItem() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}