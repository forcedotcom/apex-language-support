/**
 * Refernce to the model asset to use for the prediction request.
 */
global class CdpAssetReferenceInput {

  /**
   * ID of the asset.
   */
  global String id;

  /**
   * Name of the asset.
   */
  global String name;

  /**
   * Namespace of the asset. The default namespace is used by default.
   */
  global String namespace;

}