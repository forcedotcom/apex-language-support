/**
 * Represents the values that define the feed view of a feed-based page layout. Feed-based layouts are available on Account, Case, Contact, Lead, Opportunity, custom, and external objects. They include a feed view and a detail view.
 */
global class FeedLayout {

  global FeedLayout() {}

  public Boolean autocollapsePublisher;

  public Boolean compactFeed;

  public Metadata.FeedLayoutFilterPosition feedFilterPosition;

  public List<Metadata.FeedLayoutFilter> feedFilters;

  public Boolean fullWidthFeed;

  public Boolean hideSidebar;

  public Boolean highlightExternalFeedItems;

  public List<Metadata.FeedLayoutComponent> leftComponents;

  public List<Metadata.FeedLayoutComponent> rightComponents;

  public Boolean useInlineFiltersInConsole;

  /**
   * Makes a duplicate copy of the Metadata.FeedLayout .
   * @return Object
   */
  public Object clone() {}

}