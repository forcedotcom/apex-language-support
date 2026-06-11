/**
 * A business objective, or goal, and insights associated with it.
 */
global class BusinessObjectivesInputRepresentation {

  global BusinessObjectivesInputRepresentation() {}

  /**
   * ID of the business objective.
   */
  global String businessObjectiveId;

  /**
   * A summary of insights about the business objective.
   */
  global ConnectApi.BusObjInsightsInputRepresentation insightSummary;

  global Object clone() {}

}