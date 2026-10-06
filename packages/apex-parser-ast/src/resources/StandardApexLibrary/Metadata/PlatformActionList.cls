/**
 * Represents the list of actions, and their order, that display in the Salesforce mobile action bar for the layout.
 * Usage
 * Use this class when accessing Metadata.Layout metadata components. For more information, see “PlatformActionList” in the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api_meta.meta/api_meta/meta_intro.htm" target="_blank">Metadata API Developer Guide</a>.
 */
global class PlatformActionList extends Metadata.MetadataValue {
    /**
     * The context of the action list.
     * Metadata.PlatformActionListContextEnum
     */
    global Metadata.PlatformActionListContextEnum actionListContext { get; set; }
    /**
     * The actions in the platform action list.
     * List<Metadata.PlatformActionListItem>
     */
    global List platformActionListItems { get; set; }
    /**
     * When the actionListContext property is “RelatedList” or” “RelatedListRecord”, this field represents the API name of the related list to which the action belongs.
     * String
     */
    global String relatedSourceEntity { get; set; }

    global PlatformActionList() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}