/**
 * A file attached to a feed item.
 */
global class Content {

  /**
   * MD5 checksum for the file.
   */
  global String checksum;

  /**
   * URL of the content for links.
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
   * Size of the file in bytes. If size can’t be determined, returns unknown .
   */
  global String fileSize;

  /**
   * Type of file, such as PDF.
   */
  global String fileType;

  /**
   * true if the file has a PDF preview available; false otherwise.
   */
  global Boolean hasPdfPreview;

  /**
   * 18-character ID of the content.
   */
  global String id;

  /**
   * Image details, or null if the file isn’t an image.
   */
  global ConnectApi.ContentImageFileDetails imageDetails;

  /**
   * true if the file is synced with Salesforce Files Sync. Note Salesforce Files Sync was retired on May 25, 2018.
   */
  global Boolean isInMyFileSync;

  /**
   * MIME type of the file.
   */
  global String mimeType;

  /**
   * URL to the rendition resource for the file. For shared files, renditions process asynchronously after upload. For private files, renditions process when the first file preview is requested, and aren’t available immediately after the file is uploaded.
   */
  global String renditionUrl;

  /**
   * URL to the 240 x 180 pixel rendition resource for the file. For shared files, renditions process asynchronously after upload. For private files, renditions process when the first file preview is requested, and aren’t available immediately after the file is uploaded.
   */
  global String renditionUrl240By180;

  /**
   * URL to the 720 x 480 pixel rendition resource for the file. For shared files, renditions process asynchronously after upload. For private files, renditions process when the first file preview is requested, and aren’t available immediately after the file is uploaded.
   */
  global String renditionUrl720By480;

  /**
   * Sharing option of the file. Values are: Allowed —Resharing of the file is allowed. Restricted —Resharing of the file is restricted.
   */
  global ConnectApi.FileSharingOption sharingOption;

  /**
   * Text preview of the file if available; null otherwise.
   */
  global String textPreview;

  /**
   * Specifies the rendering status of the 120 x 90 preview image of the file. One of these values: Processing —Image is being rendered. Failed —Rendering process failed. Success —Rendering process was successful. Na —Rendering is not available for this image.
   */
  global String thumb120By90RenditionStatus;

  /**
   * Specifies the rendering status of the 240 x 180 preview image of the file. One of these values: Processing —Image is being rendered. Failed —Rendering process failed. Success —Rendering process was successful. Na —Rendering is not available for this image.
   */
  global String thumb240By180RenditionStatus;

  /**
   * Specifies the rendering status of the 720 x 480 preview image of the file. One of these values: Processing —Image is being rendered. Failed —Rendering process failed. Success —Rendering process was successful. Na —Rendering is not available for this image.
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