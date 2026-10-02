/**
 * Represents a component in the feed view of a feed-based page layout.
 * <p>Usage
 * Use this class when accessing Metadata.Layout metadata components. For more information, see “FeedLayoutComponent” in the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api_meta.meta/api_meta/meta_intro.htm" target="_blank">Metadata API Developer Guide</a>.
 */
global class FeedLayoutComponent extends Metadata.MetadataValue {
    /**
     * Represents a component in the feed view of a feed-based page layout. The type of component is required.
     * <p>Metadata.FeedLayoutComponentType
     */
    global Metadata.FeedLayoutComponentType componentType { get; set; }
    /**
     * The height, in pixels, of the component. Doesn’t apply to standardComponents
     * <p>Integer
     */
    global Integer height { get; set; }
    /**
     * The name of the Visualforce page used as a custom component.
     * <p>String
     */
    global String page_x { get; set; }

    global Object FeedLayoutComponent() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}