/**
 * Insights related to a business objective, or goal.
 */
global class BusObjInsightsOutputRepresentation {

  /**
   * The three-letter ISO currency code associated with the KPI values. For example, 'USD' for US dollars or 'EUR' for euros.
   */
  global String currencyIsoCode;

  /**
   * The current value of the KPI metric. This represents the most recent measurement or calculation of the business objective's key performance indicator.
   */
  global Double current;

  /**
   * A collection of insights related to the business objective.
   */
  global List < ConnectApi.InsightsOutputRepresentation > insights;

  /**
   * The URL to the dashboard where the KPI details and visualizations can be viewed.
   */
  global String kpiDashboardUrl;

  /**
   * A human-readable summary of the KPI's performance, including the change from the previous value.
   */
  global String kpiSummaryText;

  /**
   * The previous value of the KPI metric, used for comparison with the current value to track progress or changes over time.
   */
  global Double last;

  /**
   * The time period between the current and last values, such as 'Daily', 'Weekly', 'Monthly', or 'Quarterly'. This indicates the frequency of KPI measurements.
   */
  global String period;

  /**
   * Target date for completion of the goal.
   */
  global Datetime targetCompletionDate;

  /**
   * Target value for the goal.
   */
  global Double targetValue;

  /**
   * Unit for an insight. Values are: Count Currency Dollar Number Percent
   */
  global ConnectApi.ConnectInsightUnitEnum unit;

}