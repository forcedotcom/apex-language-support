/**
 * Insight value details for a business objective, or goal.
 */
global class InsightValuesOutputRepresentation {

  /**
   * Salesforce record ID of the record that the insight is based on.
   */
  global String contextId;

  /**
   * Name of the Salesforce record that the insight is based on.
   */
  global String name;

  /**
   * Value of the insight for the previous timeframe based on the key performance indicator.
   */
  global Double previousValue;

  /**
   * Value of the insight for the current timeframe based on the key performance indicator.
   */
  global Double value;

}