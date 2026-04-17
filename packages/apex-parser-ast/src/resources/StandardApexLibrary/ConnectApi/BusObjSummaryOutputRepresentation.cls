/**
 * Summary of a business objective, or goal.
 */
global class BusObjSummaryOutputRepresentation {

  /**
   * Description of the business objective.
   */
  global String description;

  /**
   * ID of the business objective.
   */
  global String id;

  /**
   * Summary of insights related to the business objective.
   */
  global ConnectApi.BusObjInsightsOutputRepresentation insightSummary;

  /**
   * Key performance indicator associated with the business objective.
   */
  global String kpi;

  /**
   * Display name of the business objective.
   */
  global String labelName;

  /**
   * Summary of recommended actions for the business objective.
   */
  global ConnectApi.BusObjRecommendationsOutputRepresentation recommendationSummary;

}