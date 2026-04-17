/**
 * A recommendation for a non-Salesforce entity, such as an application.
 */
global class NonEntityRecommendation extends ConnectApi.AbstractRecommendation {

  /**
   * Localized label of the non-entity object.
   */
  global String displayLabel;

  /**
   * Motif for the non-entity object.
   */
  global ConnectApi.Motif motif;

}