/**
 * Represents a component in the feed view of a feed-based page layout.
 */
global class FeedLayoutComponent {

  global FeedLayoutComponent() {}

  global Metadata.FeedLayoutComponentType componentType;

  global Integer height;

  global String page_x;

  /**
   * Makes a duplicate copy of the Metadata.FeedLayoutComponent .
   * @return Object
   */
  global Object clone() {}

}