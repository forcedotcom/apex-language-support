/**
 * A comment.
 */
global class Comment {

  /**
   * If the comment contains an attachment, property value is ContentAttachment . If the comment does not contain an attachment, it is null . Important As of version 32.0, use the capabilities property.
   */
  global ConnectApi.FeedItemAttachment attachment;

  /**
   * Body of the comment.
   */
  global ConnectApi.FeedBody body;

  /**
   * Capabilities associated with the comment, such as any file attachments.
   */
  global ConnectApi.CommentCapabilities capabilities;

  /**
   * Information about the connected app used to authenticate the connection.
   */
  global ConnectApi.ClientInfo clientInfo;

  /**
   * ISO 8601 date string, for example, 2011-02-25T18:24:31.000Z.
   */
  global Datetime createdDate;

  /**
   * Feed element on which the comment is posted.
   */
  global ConnectApi.Reference feedElement;

  /**
   * Feed item on which the comment is posted. Important As of version 32.0, use the feedElement property.
   */
  global ConnectApi.Reference feedItem;

  /**
   * Comment’s 18–character ID.
   */
  global String id;

  /**
   * If this property is true , the context user can’t delete the comment. If this property is false , the context user might be able to delete the comment.
   */
  global Boolean isDeleteRestricted;

  /**
   * The first page of likes for the comment. This property has no information for comments on direct messages.
   */
  global ConnectApi.ChatterLikePage likes;

  /**
   * A message body that describes who likes the comment. This property is null for comments on direct messages.
   */
  global ConnectApi.MessageBody likesMessage;

  /**
   * Information about the moderation flags on a comment. If ConnectApi.Features.communityModeration is false , this property is null .
   */
  global ConnectApi.ModerationFlags moderationFlags;

  /**
   * If the context user liked the comment, this property is a reference to the specific like, null otherwise. This property is null for comments on direct messages.
   */
  global ConnectApi.Reference myLike;

  /**
   * Information about the parent feed-item for this comment.
   */
  global ConnectApi.Reference parent;

  /**
   * The created date formatted as a relative, localized string, for example, “17m ago” or “Yesterday.”
   */
  global String relativeCreatedDate;

  /**
   * Level of nesting for a comment. 0 indicates a standard comment with a parent post. 1 indicates a threaded comment with a parent comment and a parent post. 2 indicates a threaded comment with two parent comments and a parent post. The UI is limited to these three levels.
   */
  global Integer threadLevel;

  /**
   * ID of the parent comment for a threaded comment.
   */
  global String threadParentId;

  /**
   * Type of comment. ContentComment —Comment holds a content capability. TextComment —Comment contains only text.
   */
  global ConnectApi.CommentType type;

  /**
   * Connect REST API URL to this comment.
   */
  global String url;

  /**
   * Information about the comment author.
   */
  global ConnectApi.UserSummary user;

}