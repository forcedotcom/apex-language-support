/**
 * Input representation for the model settings used to generate a prediction.
 */
global class CdpMlPredictSettingsInput {

  /**
   * List of aggregate functions for the prediction.
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
   * The minimum impact percentage of the prescriptions to return. Only prescriptions whose impact percentage is greater than or equal to the specified percentage are returned. The default value is 0 and the allowed range is 0 through 100 .
   */
  global Integer prescriptionImpactPercentage;

}