/**
 * A set of capabilities on a comment.
 */
global class CommentCapabilities {

  /**
   * If a comment has this capability, it has threaded comments.
   */
  global ConnectApi.CommentsCapability comments;

  /**
   * If a comment has this capability, it has a file attachment. Most ConnectApi.ContentCapability properties are null if the content has been deleted from the feed element or if the access has changed to private.
   */
  global ConnectApi.ContentCapability content;

  /**
   * If a comment has this capability, users who have permission can edit it.
   */
  global ConnectApi.EditCapability edit;

  /**
   * If a comment has this capability, a feed entity is shared with it.
   */
  global ConnectApi.FeedEntityShareCapability feedEntityShare;

  /**
   * If a comment has this capability, it has a record attachment.
   */
  global ConnectApi.RecordCapability record;

  /**
   * If a comment has this capability, it has a status that determines its visibility.
   */
  global ConnectApi.StatusCapability status;

  /**
   * If a comment has this capability, users can upvote or downvote it.
   */
  global ConnectApi.UpDownVoteCapability upDownVote;

  /**
   * If a comment has this capability, users with permission can mark it as verified or unverified.
   */
  global ConnectApi.VerifiedCapability verified;

}