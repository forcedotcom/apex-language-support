/**
 * Generated response from the LLM provider.
 */
global class EinsteinLLMGenerationItemOutput {

  /**
   * Specifies whether the generated response contains toxic language (true) or not (false) .
   */
  global ConnectApi.EinsteinLlmGenerationsContentQuality contentQualityRepresentation;

  /**
   * Parameter values for the LLM provider.
   */
  global String parameters;

  /**
   * ID of the generated response.
   */
  global String responseId;

  /**
   * Safety score information related to the generated response.
   */
  global ConnectApi.EinsteinLlmGenerationSafetyScoreOutput safetyScoreRepresentation;

  /**
   * Text of generated response.
   */
  global String text;

}