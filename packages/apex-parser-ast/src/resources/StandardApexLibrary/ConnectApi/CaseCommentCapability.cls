/**
 * If a feed element has this capability, it has a case comment on the case feed.
 */
global class CaseCommentCapability extends ConnectApi.FeedElementCapability {

  /**
   * Specifies the type of user who made the comment.
   */
  global ConnectApi.CaseActorType actorType;

  /**
   * Information about the user who created the comment.
   */
  global ConnectApi.Actor createdBy;

  /**
   * ISO 8601 date string, for example, 2011-02-25T18:24:31.000Z.
   */
  global Datetime createdDate;

  /**
   * Specifies an event type for a comment in the case feed.
   */
  global ConnectApi.CaseCommentEventType eventType;

  /**
   * 18-character ID of case comment.
   */
  global String id;

  /**
   * Specifies whether the comment has been published.
   */
  global Boolean published;

  /**
   * Text of the case comment.
   */
  global String text;

}