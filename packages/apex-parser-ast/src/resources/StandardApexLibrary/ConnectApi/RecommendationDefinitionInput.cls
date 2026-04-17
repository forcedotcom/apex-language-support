/**
 * A custom recommendation definition.
 */
global class RecommendationDefinitionInput {

  /**
   * URL for acting on the custom recommendation, for example, the URL to join a group.
   */
  global String actionUrl;

  /**
   * Text label for the action URL in the user interface, for example, “Launch.”
   */
  global String actionUrlName;

  /**
   * Explanation, or body, of the custom recommendation.
   */
  global String explanation;

  /**
   * Name of the custom recommendation definition. The name is displayed in Setup.
   */
  global String name;

  /**
   * Title of the custom recommendation definition.
   */
  global String title;

}