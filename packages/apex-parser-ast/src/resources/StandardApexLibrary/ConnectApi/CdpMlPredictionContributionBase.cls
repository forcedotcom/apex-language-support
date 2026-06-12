/**
 * Base representation for a Prediction Contribution
 */
global class CdpMlPredictionContributionBase {

  global CdpMlPredictionContributionBase() {}

  /**
   * List of field and values that have the same contribution value
   */
  global List < ConnectApi.CdpMlPredictionContributionField > fields;

  /**
   * Contribution value
   */
  global Double value;

  global Object clone() {}

}