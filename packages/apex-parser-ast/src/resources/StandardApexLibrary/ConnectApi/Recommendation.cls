/**
 * A Next Best Action recommendation object.
 */
global class Recommendation {

  /**
   * Text indicating user acceptance of the recommendation.
   */
  global String acceptanceLabel;

  /**
   * Reference to the action to perform, for example, launching a flow.
   */
  global String actionReference;

  /**
   * Description of the recommendation.
   */
  global String description;

  /**
   * External ID of the recommendation. This ID doesn’t need to be a Salesforce 18-character ID. For example, it can be a product number from an external system.
   */
  global String externalId;

  /**
   * ID of the recommendation.
   */
  global String id;

  /**
   * Image to display.
   */
  global ConnectApi.FileAsset image;

  /**
   * Name of the recommendation.
   */
  global String name;

  /**
   * Text indicating user rejection of the recommendation.
   */
  global String rejectionLabel;

  /**
   * URL to the recommendation.
   */
  global String url;

}