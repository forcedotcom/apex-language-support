/**
 * A collection of file previews.
 */
global class FilePreviewCollection {

  /**
   * ID of the file.
   */
  global String fileId;

  /**
   * Previews supported for the file.
   */
  global List < ConnectApi.FilePreview > previews;

  /**
   * URL to the current page of file previews.
   */
  global String url;

  /**
   * Version number of the file.
   */
  global String versionNumber;

}