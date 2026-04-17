/**
 * Metadata for a link.
 */
global class LinkMetadata {

  /**
   * Description of the link.
   */
  global String description;

  /**
   * HTML required to display the resource.
   */
  global String frameSource;

  /**
   * Height required to display the HTML.
   */
  global Integer height;

  /**
   * Original URL that was used to request the metadata.
   */
  global String originalUrl;

  /**
   * URL of the provider that the information is retrieved from.
   */
  global String providerUrl;

  /**
   * Source of the link metadata. Values are: None —Link metadata wasn’t retrieved. Sfdc —Salesforce is the source.
   */
  global ConnectApi.LinkMetadataSource source;

  /**
   * Thumbnail of the resource.
   */
  global String thumbnailUrl;

  /**
   * Title of the link.
   */
  global String title;

  /**
   * Type of link that the metadata represents. Values are: Error —Link metadata couldn’t be retrieved. Link —Represents a link. None —Link metadata wasn’t retrieved because the link isn’t an allowed domain. Photo —Represents a photo. Rich —Represents rich content, typically HTML content. Unknown —Link metadata was retrieved, but the type is unknown. Video —Represents a video.
   */
  global ConnectApi.LinkMetadataType type;

  /**
   * URL of the image to display, if one is available.
   */
  global String url;

  /**
   * Width required to display the HTML.
   */
  global Integer width;

}