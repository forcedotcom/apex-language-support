/**
 * Represents the values that define the feed view of a feed-based page layout. Feed-based layouts are available on Account, Case, Contact, Lead, Opportunity, custom, and external objects. They include a feed view and a detail view.
 */
global class FeedLayout {

  global FeedLayout() {}

  global Boolean autocollapsePublisher;

  global Boolean compactFeed;

  global Metadata.FeedLayoutFilterPosition feedFilterPosition;

  global List<Metadata.FeedLayoutFilter> feedFilters;

  global Boolean fullWidthFeed;

  global Boolean hideSidebar;

  global Boolean highlightExternalFeedItems;

  global List<Metadata.FeedLayoutComponent> leftComponents;

  global List<Metadata.FeedLayoutComponent> rightComponents;

  global Boolean useInlineFiltersInConsole;

  /**
   * Makes a duplicate copy of the Metadata.FeedLayout .
   * @return Object
   */
  global Object clone() {}

}