/**
 * Indicates if the context user can edit a feed element or comment.
 */
global class FeedEntityIsEditable {

  /**
   * true if the context user can add and remove attachments on the feed element or comment, false otherwise.
   */
  global Boolean areAttachmentsEditableByMe;

  /**
   * URL of the feed element or comment.
   */
  global String feedEntityUrl;

  /**
   * true if the context user can edit the feed element or comment, false otherwise.
   */
  global Boolean isEditableByMe;

}