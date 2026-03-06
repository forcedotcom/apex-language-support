/**
 * Input representation for replacing a managed content variant.
 */
global class ManagedContentVariantUpdateInput {

  /**
   * API name of the managed content variant.
   */
  global String apiName;

  /**
   * Body of the managed content variant.
   */
  global ConnectApi.ManagedContentBodyInput contentBody;

  /**
   * Title of the managed content variant.
   */
  global String title;

  /**
   * URL name of the managed content variant within the org.
   */
  global String urlName;

}