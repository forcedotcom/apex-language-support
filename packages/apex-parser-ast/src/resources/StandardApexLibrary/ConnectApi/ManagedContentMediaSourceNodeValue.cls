/**
 * Source of managed content media.
 */
global class ManagedContentMediaSourceNodeValue {

  /**
   * File name of the media source.
   */
  global String fileName;

  /**
   * Specifies whether the media source is referenced via an external URL ( true ) or uploaded ( false ).
   */
  global Boolean isExternal;

  /**
   * Type of managed content media. Values are: Document Image
   */
  global ConnectApi.ManagedContentMediaType mediaType;

  /**
   * MIME type of the media source.
   */
  global String mimeType;

  /**
   * Reference ID of the uploaded media source.
   */
  global String referenceId;

  /**
   * Resource URL of the media source.
   */
  global String resourceUrl;

  /**
   * URL to the media source for unauthenticated users, or null if the media source isn’t available to external users.
   */
  global String unauthenticatedUrl;

  /**
   * URL to the media source for authenticated users.
   */
  global String url;

}