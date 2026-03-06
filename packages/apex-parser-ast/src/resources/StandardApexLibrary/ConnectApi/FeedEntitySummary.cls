/**
 * The summary of a feed entity that is shared with a feed element.
 */
global class FeedEntitySummary {

  /**
   * Entity that created the feed entity.
   */
  global ConnectApi.Actor actor;

  /**
   * Information about the feed entity.
   */
  global ConnectApi.FeedBody body;

  /**
   * ISO 8601 date string, for example, 2011-02-25T18:24:31.000Z, when the entity was created.
   */
  global Datetime createdDate;

  /**
   * Type of feed entity. Bundle —A container of feed elements. A bundle also has a body made up of message segments that can always be gracefully degraded to text-only values. FeedItem —A feed item has a single parent and is scoped to oneExperience Cloud site or across all Experience Cloud sites. A feed item can have capabilities such as bookmarks, canvas, content, comment, link, poll. Feed items have a body made up of message segments that can always be gracefully degraded to text-only values. Recommendation —A recommendation is a feed element with a recommendations capability. A recommendation suggests records to follow, groups to join, or applications that are helpful to the context user.
   */
  global ConnectApi.FeedElementType feedElementType;

  /**
   * 18-character ID of the feed entity.
   */
  global String id;

  /**
   * Specifies whether the entity is available. If false , either the user doesn’t have access to the entity or the entity was deleted.
   */
  global Boolean isEntityAvailable;

  /**
   * Parent of the feed entity.
   */
  global ConnectApi.ActorWithId parent;

  /**
   * Relative created date, for example, “2h ago.”
   */
  global String relativeCreatedDate;

  /**
   * URL to the feed entity.
   */
  global String url;

}