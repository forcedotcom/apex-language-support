/**
 * Represents a feed filter option in the feed view of a feed-based page layout. A filter can have only standardFilter or feedItemType set.
 */
global class FeedLayoutFilter {

  global FeedLayoutFilter() {}

  public String feedFilterName;

  public Metadata.FeedLayoutFilterType feedFilterType;

  public Metadata.FeedItemTypeEnum feedItemType;

  /**
   * Makes a duplicate copy of the Metadata.FeedLayoutFilter .
   * @return Object
   */
  public Object clone() {}

}