/**
 * Represents a component in the feed view of a feed-based page layout.
 */
global class FeedLayoutComponent {

  global FeedLayoutComponent() {}

  public Metadata.FeedLayoutComponentType componentType;

  public Integer height;

  public String page_x;

  /**
   * Makes a duplicate copy of the Metadata.FeedLayoutComponent .
   * @return Object
   */
  public Object clone() {}

}