/**
 * Attach a new file to a feed item.
 */
global class NewFileAttachmentInput extends ConnectApi.FeedItemAttachmentInput {

  /**
   * Description of the file to be uploaded.
   */
  global String description;

  /**
   * The title of the file. This value is required and is also used as the file name. For example, if the title is My Title, and the file is a .txt file, the file name is My Title.txt.
   */
  global String title;

}