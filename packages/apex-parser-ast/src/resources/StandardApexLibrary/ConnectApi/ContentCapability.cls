/**
 * If a comment has this capability, it has a file attachment.
 */
global class ContentCapability {

  /**
   * MD5 checksum for the file.
   */
  global String checksum;

  /**
   * URL of the content for links and Google docs.
   */
  global String contentUrl;

  /**
   * Description of the attachment.
   */
  global String description;

  /**
   * URL to the content.
   */
  global String downloadUrl;

  /**
   * Extension of the file.
   */
  global String fileExtension;

  /**
   * Size of the file in bytes. If size cannot be determined, returns Unknown .
   */
  global String fileSize;

  /**
   * Type of file.
   */
  global String fileType;

  /**
   * true if the file has a PDF preview available, false otherwise.
   */
  global Boolean hasPdfPreview;

  /**
   * 18-character ID of the content.
   */
  global String id;

  /**
   * true if the file is synced with Salesforce Files Sync; false otherwise. Note Salesforce Files Sync was retired on May 25, 2018.
   */
  global Boolean isInMyFileSync;

  /**
   * MIME type of the file.
   */
  global String mimeType;

  /**
   * URL to the rendition resource for the file. Renditions are processed asynchronously and may not be available immediately after the file has been uploaded.
   */
  global String renditionUrl;

  /**
   * URL to the 240x180 size rendition resource for the file. Renditions are processed asynchronously and may not be available immediately after the file has been uploaded.
   */
  global String renditionUrl240By180;

  /**
   * URL to the 720x480 size rendition resource for the file. Renditions are processed asynchronously and may not be available immediately after the file has been uploaded.
   */
  global String renditionUrl720By480;

  /**
   * Sharing option of the file. Values are: Allowed —Resharing of the file is allowed. Restricted —Resharing of the file is restricted.
   */
  global ConnectApi.FileSharingOption sharingOption;

  /**
   * Text preview of the file if available, null otherwise. The maximum number of characters is 200.
   */
  global String textPreview;

  /**
   * The status of the rendering of the 120x90 pixel sized preview image of the file. Should be either Processing, Failed, Success, or Na if unavailable.
   */
  global String thumb120By90RenditionStatus;

  /**
   * The status of the rendering of the 240x180 pixel sized preview image of the file. Should be either Processing, Failed, Success, or Na if unavailable.
   */
  global String thumb240By180RenditionStatus;

  /**
   * The status of the rendering of the 720x480 pixel sized preview image of the file. Should be either Processing, Failed, Success, or Na if unavailable.
   */
  global String thumb720By480RenditionStatus;

  /**
   * Title of the file.
   */
  global String title;

  /**
   * Version ID of the file.
   */
  global String versionId;

}