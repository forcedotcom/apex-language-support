/**
 * Feed elements are the top-level items that a feed contains. Feeds are feed element containers.
 */
global class FeedElement {

  /**
   * Information about the feed element. Important Use the header.text property as the default value for rendering text because the body.text property can be null .
   */
  global ConnectApi.FeedBody body;

  /**
   * A container for all capabilities that can be included with a feed element.
   */
  global ConnectApi.FeedElementCapabilities capabilities;

  /**
   * ISO 8601 format date string, for example, 2011-02-25T18:24:31.000Z.
   */
  global Datetime createdDate;

  /**
   * Feed elements are the top-level objects that a feed contains. The feed element type describes the characteristics of that feed element. One of these values: Bundle —A container of feed elements. A bundle also has a body made up of message segments that can always be gracefully degraded to text-only values. FeedItem —A feed item has a single parent and is scoped to oneExperience Cloud site or across all Experience Cloud sites. A feed item can have capabilities such as bookmarks, canvas, content, comment, link, poll. Feed items have a body made up of message segments that can always be gracefully degraded to text-only values. Recommendation —A recommendation is a feed element with a recommendations capability. A recommendation suggests records to follow, groups to join, or applications that are helpful to the context user.
   */
  global ConnectApi.FeedElementType feedElementType;

  /**
   * The header is the title of the post. This property contains renderable plain text for all the segments of the message. If a client doesn’t know how to render a feed element type, it should render this text.
   */
  global ConnectApi.MessageBody header;

  /**
   * 18-character ID of the feed element.
   */
  global String id;

  /**
   * ISO 8601 format date string, for example, 2011-02-25T18:24:31.000Z.
   */
  global Datetime modifiedDate;

  /**
   * Feed element’s parent
   */
  global ConnectApi.ActorWithId parent;

  /**
   * The created date formatted as a relative, localized string, for example, “17m ago” or “Yesterday.”
   */
  global String relativeCreatedDate;

  /**
   * Connect REST API URL to this feed element.
   */
  global String url;

}