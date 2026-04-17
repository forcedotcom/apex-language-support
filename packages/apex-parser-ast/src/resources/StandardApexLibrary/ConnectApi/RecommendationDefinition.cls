/**
 * Represents a custom recommendation definition.
 */
global class RecommendationDefinition {

  /**
   * The URL for acting on this custom recommendation.
   */
  global String actionUrl;

  /**
   * The text label for the action URL in the user interface.
   */
  global String actionUrlName;

  /**
   * Explanation of the custom recommendation definition.
   */
  global String explanation;

  /**
   * 18-character ID of the custom recommendation definition.
   */
  global String id;

  /**
   * Name of the custom recommendation definition. The name is displayed in Setup.
   */
  global String name;

  /**
   * Photo of the custom recommendation definition.
   */
  global ConnectApi.Photo photo;

  /**
   * Title of the custom recommendation definition.
   */
  global String title;

  /**
   * URL to the Connect REST API resource for the custom recommendation definition.
   */
  global String url;

}