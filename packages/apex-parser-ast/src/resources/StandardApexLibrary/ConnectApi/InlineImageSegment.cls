/**
 * An inline image in the feed body.
 */
global class InlineImageSegment {

  /**
   * Alt text for the inline image.
   */
  global String altText;

  /**
   * Size of the file in bytes.
   */
  global Integer contentSize;

  /**
   * Extension of the file, such as gif.
   */
  global String fileExtension;

  /**
   * Information about the available thumbnails for the image.
   */
  global ConnectApi.FilePreviewCollection thumbnails;

  /**
   * URL to the latest version of the inline image.
   */
  global String url;

}