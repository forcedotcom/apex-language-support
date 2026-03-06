/**
 * Recommendations returned by a recommendation strategy.
 */
global class NBARecommendations {

  /**
   * Runtime debug information recorded during recommendation strategy execution.
   */
  global String debug;

  /**
   * Runtime errors that occurred during recommendation strategy execution.
   */
  global String errors;

  /**
   * ID of the recommendation strategy execution.
   */
  global String executionId;

  /**
   * ID of the user or entity for which the recommendation strategy was executed.
   */
  global String onBehalfOfId;

  /**
   * List of recommendations returned by a recommendation strategy.
   */
  global List < ConnectApi.NBARecommendation > recommendations;

  /**
   * Trace information for the recommendation strategy execution, if requested.
   */
  global ConnectApi.StrategyTrace trace;

}