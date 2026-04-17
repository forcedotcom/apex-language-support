/**
 * Attach or update a file on a comment. Use this class to attach a new file or update a file that has already been uploaded to Salesforce.
 */
global class ContentCapabilityInput extends ConnectApi.FeedElementCapabilityInput {

  /**
   * ID of the existing content.
   */
  global String contentDocumentId;

  /**
   * Description of the file to be uploaded.
   */
  global String description;

  /**
   * Sharing option of the file. Values are: Allowed —Resharing of the file is allowed. Restricted —Resharing of the file is restricted.
   */
  global ConnectApi.FileSharingOption sharingOption;

  /**
   * Title of the file. This value is used as the file name for new content. For example, if the title is My Title, and the file is a .txt file, the file name is My Title.txt.
   */
  global String title;

}