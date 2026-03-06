/**
 * A repository file.
 */
global class AbstractRepositoryFile {

  /**
   * Checkin comment of the file.
   */
  global String checkinComment;

  /**
   * Text of the file’s content if available, otherwise null .
   */
  global String contentBody;

  /**
   * Length in bytes of the content of the file, including files that are larger than 2 GB.
   */
  global Long Class contentItemSize;

  /**
   * Length in bytes of the content of the file, for files that are smaller than 2 GB.
   */
  global Integer contentSize;

  /**
   * URL to the repository file content.
   */
  global String downloadUrl;

  /**
   * URL of this file’s content in the external system.
   */
  global String externalContentUrl;

  /**
   * URL of this file in the external system.
   */
  global String externalDocumentUrl;

  /**
   * External file permission information, such as available groups, available permission types, and current sharing status, or null if includeExternalFilePermissionsInfo is false .
   */
  global ConnectApi.ExternalFilePermissionInformation externalFilePermissionInformation;

  /**
   * Mime type of the file.
   */
  global String mimeType;

  /**
   * URL to the thumbnail preview (240 x 180 PNG).
   */
  global String previewUrlThumbnail;

  /**
   * URL to the big thumbnail preview (720 x 480 PNG).
   */
  global String previewUrlThumbnailBig;

  /**
   * URL to the tiny thumbnail preview (120 x 90 PNG).
   */
  global String previewUrlThumbnailTiny;

  /**
   * URL to the previews.
   */
  global String previewsUrl;

  /**
   * Title of the file.
   */
  global String title;

  /**
   * ID of the file version in the external system.
   */
  global String versionId;

}