/**
 * Media associated with a product.
 */
global class ProductMedia {

  global ProductMedia() {}

  /**
   * Alternative text for the product media.
   */
  global String alternateText;

  /**
   * ID of the latest published content version if the media is stored as a ContentDocument. If the image is a customer-provided external URL, the value is null . Not supported in enhanced CMS workspaces.
   */
  global String contentVersionId;

  /**
   * ID of the product image.
   */
  global String id;

  /**
   * Type of product media. Values are: Document Image Video
   */
  global ConnectApi.ProductMediaType mediaType;

  /**
   * Sort order of a media item within a media group.
   */
  global Integer sortOrder;

  /**
   * URL of the thumbnail for product media. If a value exists, it should be used for the thumbnail whether the image is natively uploaded or hosted externally. Not supported in enhanced CMS workspaces.
   */
  global String thumbnailUrl;

  /**
   * Title of the product media.
   */
  global String title;

  /**
   * URL of the product media.
   */
  global String url;

  global Object clone() {}

  global String getAlternateText() {}

  global String getContentVersionId() {}

  global String getId() {}

  global ConnectApi.ProductMediaType getMediaType() {}

  global Integer getSortOrder() {}

  global String getThumbnailUrl() {}

  global String getTitle() {}

  global String getUrl() {}

  global void setAlternateText(String value) {}

  global void setContentVersionId(String value) {}

  global void setId(String value) {}

  global void setMediaType(ConnectApi.ProductMediaType value) {}

  global void setSortOrder(Integer value) {}

  global void setThumbnailUrl(String value) {}

  global void setTitle(String value) {}

  global void setUrl(String value) {}

}