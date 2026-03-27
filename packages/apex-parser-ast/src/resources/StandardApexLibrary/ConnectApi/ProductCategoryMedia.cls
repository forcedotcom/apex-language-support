/**
 * Media associated with a product category.
 */
global class ProductCategoryMedia {

  /**
   * Alternative text for the product category media.
   */
  global String alternateText;

  /**
   * ID of the latest published content version if the media is stored as a ContentDocument. If the image is a customer-provided external URL, the value is null . Not supported in enhanced CMS workspaces.
   */
  global String contentVersionId;

  /**
   * ID of the product category image.
   */
  global String id;

  /**
   * Type of product media. Values are: Document Image Video
   */
  global ConnectApi.ProductMediaType mediaType;

  /**
   * Sort order of a media item inside a media group.
   */
  global Integer sortOrder;

  /**
   * URL of the thumbnail for product media. If a value exists, it should be used for the thumbnail whether the image is natively uploaded or hosted externally. Not supported in enhanced CMS workspaces.
   */
  global String thumbnailUrl;

  /**
   * Title of the product category media.
   */
  global String title;

  /**
   * URL of the product category media.
   */
  global String url;

}