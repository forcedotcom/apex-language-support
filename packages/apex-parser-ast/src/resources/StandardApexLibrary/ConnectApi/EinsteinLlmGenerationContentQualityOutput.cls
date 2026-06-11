/**
 * Quality information about the generated response.
 */
global class EinsteinLlmGenerationContentQualityOutput {

  global EinsteinLlmGenerationContentQualityOutput() {}

  /**
   * Specifies whether the generated response contains toxic language (true) or not (false) .
   */
  global Boolean isToxicityDetected;

  global Object clone() {}

}