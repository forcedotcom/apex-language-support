/**
 * A file preview.
 */
global class FilePreview {

  /**
   * The format of the preview. Values are: Audio —Preview format is MP3. Jpg —Preview format is JPG. Pdf —Preview format is PDF. Svg —Preview format is compressed SVG. Thumbnail —Preview format is 240 x 180 PNG. ThumbnailBig —Preview format is 720 x 480 PNG. ThumbnailTiny —Preview format is 120 x 90 PNG. Video —Preview format is MP4.
   */
  global ConnectApi.FilePreviewFormat format;

  /**
   * The total number of preview URLs for this preview format.
   */
  global Integer previewUrlCount;

  /**
   * A list of file preview URLs.
   */
  global List < ConnectApi.FilePreviewUrl > previewUrls;

  /**
   * The availability status of the preview. Values are: Available —Preview is available. InProgress —Preview is being processed. NotAvailable —Preview is unavailable. NotScheduled —Generation of the preview isn’t scheduled yet.
   */
  global ConnectApi.FilePreviewStatus status;

  /**
   * The URL for the file preview.
   */
  global String url;

}