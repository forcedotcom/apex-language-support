/**
 * Represents the Mobile Cards section of the page layout.
 * <p>Usage
 * Use this class when accessing Metadata.Layout metadata components. For more information, see “RelatedContent” in the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api_meta.meta/api_meta/meta_intro.htm" target="_blank">Metadata API Developer Guide</a>.
 */
global class RelatedContent extends Metadata.MetadataValue {
    /**
     * A list of layout items in the Mobile Cards section of the page layout.
     * <p>List<Metadata.RelatedContentItem>
     */
    global List relatedContentItems { get; set; }

    global RelatedContent() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}