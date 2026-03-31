/**
 * Prediction settings.
 */
global class CdpMlPredictSettings {

  /**
   * List of aggregate functions.
   */
  global List < String > aggregateFunctions;

  /**
   * Maximum number of recommendations. The default value is -1 (unlimited) and the allowed range is -1 through 200 .
   */
  global Integer maxPrescriptions;

  /**
   * Maximum number of top factors. The default value is 0 and the allowed range is 0 through 3 .
   */
  global Integer maxTopFactors;

  /**
   * Impact percentage of prescriptions. The default value is 0 and the range of values is 0 through 100 .
   */
  global Integer prescriptionImpactPercentage;

}