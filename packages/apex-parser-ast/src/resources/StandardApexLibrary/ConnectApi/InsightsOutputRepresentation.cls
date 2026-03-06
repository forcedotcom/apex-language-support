/**
 * Insight details for a business objective, or goal.
 */
global class InsightsOutputRepresentation {

  /**
   * URL to the dashboard where the insight can be viewed.
   */
  global String dashboardUrl;

  /**
   * A localized, human-readable summary of the insight value's performance, including the change from the previous value.
   */
  global String insightSummaryText;

  /**
   * Name of the insight.
   */
  global String name;

  /**
   * List of insight categories.
   */
  global List < ConnectApi.InsightsValuesOutputRepresentation > values;

}