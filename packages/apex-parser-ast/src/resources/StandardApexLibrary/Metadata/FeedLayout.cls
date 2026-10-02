/**
 * Represents the values that define the feed view of a feed-based page layout. Feed-based layouts are available on Account, Case, Contact, Lead, Opportunity, custom, and external objects. They include a feed view and a detail view.
 * <p>Usage
 * Use this class when accessing Metadata.Layout metadata components. For more information, see “FeedLayout” in the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api_meta.meta/api_meta/meta_intro.htm" target="_blank">Metadata API Developer Guide</a>.
 */
global class FeedLayout extends Metadata.MetadataValue {
    /**
     * Specifies whether the publisher is collapsed when the page loads (true) or not (false).
     * <p>Boolean
     */
    global Boolean autocollapsePublisher { get; set; }
    /**
     * Specifies whether the feed-based page layout uses a compact feed (true) or not (false). If set to true, feed items on the page are collapsed by default, and the feed view has an updated design.
     * <p>Boolean
     */
    global Boolean compactFeed { get; set; }
    /**
     * Indicates where the feed filters list is included in the layout.
     * <p>FeedLayoutFilterPosition Enum
     */
    global Metadata.FeedLayoutFilterPosition feedFilterPosition { get; set; }
    /**
     * The individual filters displayed in the feed filters list.
     * <p>List<FeedLayoutFilter Class>.
     */
    global List feedFilters { get; set; }
    /**
     * Specifies whether the feed expands horizontally to take up all available space on the page (true) or not (false).
     * <p>Boolean
     */
    global Boolean fullWidthFeed { get; set; }
    /**
     * Specifies whether the sidebar is hidden (true) or not (false).
     * <p>Boolean
     */
    global Boolean hideSidebar { get; set; }
    /**
     * Controls whether to highlight external feed items (true) or not (false).
     * <p>Boolean
     */
    global Boolean highlightExternalFeedItems { get; set; }
    /**
     * The individual components displayed in the left column of the feed view.
     * <p>List<FeedLayoutComponent Class>
     */
    global List leftComponents { get; set; }
    /**
     * Lists the individual components displayed in the right column of the feed view.
     * <p>List<FeedLayoutComponent Class>
     */
    global List rightComponents { get; set; }
    /**
     * Indicates whether to use inline filters in the Salesforce console.
     * <p>Boolean
     */
    global Boolean useInlineFiltersInConsole { get; set; }

    global Object FeedLayout() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}