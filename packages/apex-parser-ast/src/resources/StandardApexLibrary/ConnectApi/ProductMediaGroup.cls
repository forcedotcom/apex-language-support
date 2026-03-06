/**
 * Media group associated with a product.
 */
global class ProductMediaGroup {

  /**
   * API name of the product media group.
   */
  global String developerName;

  /**
   * ID of the product media group.
   */
  global String id;

  /**
   * List of media items within a product media group.
   */
  global List < ConnectApi.ProductMedia > mediaItems;

  /**
   * Name of the product media group.
   */
  global String name;

  /**
   * Usage type of a product media item within a media group. Values are: Attachment —Product media group with product documents as attachments. Banner —Product category media group with banner images of the product. Listing —Product media group with listing images of the product. Standard —Product media group with standard images and videos of the product. Tile —Product category media group with tile images of the product.
   */
  global ConnectApi.ProductMediaUsageType usageType;

}