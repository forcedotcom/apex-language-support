/**
 * Model asset reference used as part of the prediction request.
 */
global class CdpAssetReference {

  global CdpAssetReference() {}

  /**
   * ID of the asset.
   */
  global String id;

  /**
   * Name of the asset.
   */
  global String name;

  /**
   * Namespace of the asset.
   */
  global String namespace;

  global Object clone() {}

}