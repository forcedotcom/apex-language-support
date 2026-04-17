/**
 * Comment input used to add rich comments, for example, comments that include mentions or file attachments.
 */
global class CommentInput {

  /**
   * Specifies an attachment for the comment. Valid values are: ContentAttachmentInput NewFileAttachmentInput LinkAttachmentInput is not permitted for comments. Important As of version 32.0, use the capabilities property.
   */
  global ConnectApi.FeedItemAttachmentInput attachment;

  /**
   * Description of message body. The body can contain up to 10,000 characters and 25 mentions. Because the character limit can change, clients should make a describeSObjects() call on the FeedItem or FeedComment object and look at the length of the Body or CommentBody field to determine the maximum number of allowed characters. To edit this property in a comment, use updateComment(communityId, commentId, comment) . Editing comments is supported in version 34.0 and later. Rich text and inline images are supported in comment bodies in version 35.0 and later. Inline images in content bodies must use content document (069) image files previously uploaded to Salesforce. Entity links are supported in version 43.0 and later.
   */
  global ConnectApi.MessageBodyInput body;

  /**
   * Specifies any capabilities for the comment, such as a file attachment.
   */
  global ConnectApi.CommentCapabilityInput capabilities;

  /**
   * ID of the parent comment for a threaded comment.
   */
  global String threadParentId;

}