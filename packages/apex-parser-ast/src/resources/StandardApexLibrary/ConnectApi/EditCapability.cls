/**
 * If a feed element or comment has this capability, users who have permission can edit it.
 */
global class EditCapability {

  /**
   * Specifies whether editing this feed element or comment is restricted. If true , the context user can’t edit this feed element or comment. If false , the context user may or may not have permission to edit this feed element or comment. To determine if the context user can edit a feed element or comment, use the isFeedElementEditableByMe(communityId, feedElementId) or isCommentEditableByMe(communityId, commentId) method.
   */
  global Boolean isEditRestricted;

  /**
   * The URL to check if the context user is able to edit this feed element or comment.
   */
  global String isEditableByMeUrl;

  /**
   * Who last edited this feed element or comment.
   */
  global ConnectApi.Actor lastEditedBy;

  /**
   * The most recent edit date of this feed element or comment.
   */
  global Datetime lastEditedDate;

  /**
   * The most recent revision of this feed element or comment.
   */
  global Integer latestRevision;

  /**
   * Relative last edited date, for example, “2h ago.”
   */
  global String relativeLastEditedDate;

}