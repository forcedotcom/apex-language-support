/**
 * An asset file.
 */
global class FileAsset {

  /**
   * Base download URL of the asset.
   */
  global String baseAssetUrl;

  /**
   * Base download URL of the asset for unauthenticated users if isVisibleByExternalUsers is true , otherwise null .
   */
  global String baseUnauthenticatedAssetUrl;

  /**
   * ID of the asset.
   */
  global String id;

  /**
   * Indicates whether unauthenticated users can see the asset file ( true ) or not ( false ).
   */
  global Boolean isVisibleByExternalUsers;

  /**
   * Label of the asset.
   */
  global String masterLabel;

  /**
   * Unique name of the asset.
   */
  global String name;

  /**
   * Namespace prefix of the package containing the asset.
   */
  global String namespacePrefix;

  /**
   * Type of asset.
   */
  global String type;

}