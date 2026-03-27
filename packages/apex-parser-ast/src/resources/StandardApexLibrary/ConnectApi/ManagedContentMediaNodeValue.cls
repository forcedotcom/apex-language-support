/**
 * Managed content node of media type.
 */
global class ManagedContentMediaNodeValue extends ConnectApi.ManagedContentNodeValue {

  /**
   * Alternative text for the managed content node.
   */
  global String altText;

  /**
   * Alternative URL to the managed content node. In version 49.0 and later, this information is returned in the thumbnailUrl property.
   */
  global String altUrl;

  /**
   * Content key of the managed content.
   */
  global String contentKey;

  /**
   * File name of the managed content node.
   */
  global String fileName;

  /**
   * Type of managed content media. Value is Image .
   */
  global ConnectApi.ManagedContentMediaType mediaType;

  /**
   * MIME type of the managed content node.
   */
  global String mimeType;

  /**
   * Resource URL to the image. In version 48.0, the resource URL is available if referencing asset files and is null if referencing media. In version 49.0 and later, the resource URL is available if referencing asset files or media.
   */
  global String resourceUrl;

  /**
   * URL to the thumbnail of the media.
   */
  global String thumbnailUrl;

  /**
   * Title of the managed content node.
   */
  global String title;

  /**
   * Unauthenticated URL to the image or null if the image isn’t visible to external users.
   */
  global String unauthenticatedUrl;

  /**
   * URL to the image.
   */
  global String url;

}