/**
 * A recommendation returned by a recommendation strategy.
 */
global class NBARecommendation {

  /**
   * Reserved for future use.
   */
  global String aiModel;

  /**
   * Text indicating user acceptance of the recommendation.
   */
  global String acceptanceLabel;

  /**
   * Description of the recommendation.
   */
  global String description;

  /**
   * External ID of the recommendation. This ID doesn’t need to be a Salesforce 18-character ID. For example, it can be a product number from an external system.
   */
  global String externalId;

  /**
   * URL to the asset file to display.
   */
  global String imageUrl;

  /**
   * Reserved for future use.
   */
  global String recommendationMode;

  /**
   * Reserved for future use.
   */
  global Double recommendationScore;

  /**
   * Text indicating user rejection of the recommendation.
   */
  global String rejectionLabel;

  /**
   * Target to act on.
   */
  global ConnectApi.AbstractNBATarget target;

  /**
   * Action to recommend.
   */
  global ConnectApi.AbstractNBAAction targetAction;

}