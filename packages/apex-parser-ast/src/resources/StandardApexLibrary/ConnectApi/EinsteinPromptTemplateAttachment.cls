/**
 * Data for file attachments to prompts.
 */
global class EinsteinPromptTemplateAttachment {

  global EinsteinPromptTemplateAttachment() {}

  /**
   * Information about file attachments that cannot be processed.
   */
  global ConnectApi.EinsteinPromptTemplateAttachmentExclusionInfo exclusionInfo;

  /**
   * Extension of the file attachment.
   */
  global String fileExtension;

  /**
   * Content document ID of the file attachment.
   */
  global String id;

  /**
   * Content version ID of the file attachment.
   */
  global String latestPublishedVersion;

  /**
   * ParentName of the file attachment.
   */
  global String parentName;

  /**
   * Title of the file attachment.
   */
  global String title;

  global Object clone() {}

}