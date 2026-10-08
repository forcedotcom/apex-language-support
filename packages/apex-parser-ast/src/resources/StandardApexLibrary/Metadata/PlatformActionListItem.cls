/**
 * Represents an action in the platform action list for a layout.
 * Usage
 * Use this class when accessing Metadata.Layout metadata components. For more information, see “PlatformActionListItem” in the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api_meta.meta/api_meta/meta_intro.htm" target="_blank">Metadata API Developer Guide</a>.
 */
global class PlatformActionListItem extends Metadata.MetadataValue {
    /**
     * The API name for the action in the list.
     * String
     */
    global String actionName { get; set; }
    /**
     * The type of action.
     * Metadata.PlatformActionTypeEnum
     */
    global Metadata.PlatformActionTypeEnum actionType { get; set; }
    /**
     * The placement of the action in the list.
     * Integer
     */
    global Integer sortOrder { get; set; }
    /**
     * The subtype of the action.
     * String
     */
    global String subtype { get; set; }

    global PlatformActionListItem() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}