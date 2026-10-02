/**
 * Represents a mini view of a record in the Console tab, hover details, and event overlays.
 * <p>Usage
 * Use this class when accessing Metadata.Layout metadata components. For more information, see “MiniLayout” in the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api_meta.meta/api_meta/meta_intro.htm" target="_blank">Metadata API Developer Guide</a>.
 */
global class MiniLayout extends Metadata.MetadataValue {
    /**
     * The fields for the mini-layout, listed in the order they appear in the UI. Fields that appear in the mini-layout must appear in the main layout.
     * <p>List<String>
     */
    global List fields { get; set; }
    /**
     * The mini related lists, listed in the order they appear in the UI. You cannot set sorting on mini related lists. Fields that appear in the mini related lists must appear in the main layout.
     * <p>List<Metadata.RelatedListItem>
     */
    global List relatedLists { get; set; }

    global Object MiniLayout() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}