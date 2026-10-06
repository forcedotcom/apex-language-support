/**
 * Represents a feed filter option in the feed view of a feed-based page layout. A filter can have only standardFilter or feedItemType set.
 * Usage
 * Use this class when accessing Metadata.Layout metadata components. For more information, see “FeedLayoutFilter” in the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api_meta.meta/api_meta/meta_intro.htm" target="_blank">Metadata API Developer Guide</a>.
 */
global class FeedLayoutFilter extends Metadata.MetadataValue {
    /**
     * The name of a CustomFeedFilter component. Names are prefixed with the name of the parent object. For example, Case.MyCustomFeedFilter.
     * String
     */
    global String feedFilterName { get; set; }
    /**
     * The type of filter.
     * FeedLayoutFilterType Enum
     */
    global Metadata.FeedLayoutFilterType feedFilterType { get; set; }
    /**
     * The type of feed item to display.
     * FeedItemTypeEnum Enum
     */
    global Metadata.FeedItemTypeEnum feedItemType { get; set; }

    global FeedLayoutFilter() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}