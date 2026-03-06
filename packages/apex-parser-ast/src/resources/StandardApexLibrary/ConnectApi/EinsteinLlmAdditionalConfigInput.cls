/**
 * Additional configuration information for the LLM provider.
 */
global class EinsteinLlmAdditionalConfigInput {

  /**
   * Map of parameters and values for the LLM provider.
   */
  global Map < String , ConnectApi.WrappedValue > additionalParameters;

  /**
   * Name of the application.
   */
  global String applicationName;

  /**
   * Specifies whether to mask personally identifiable information (PII) ( true ) or not ( false ).
   */
  global Boolean enablePiiMasking;

  /**
   * Use to reduce the repetitiveness of generated tokens. The higher the value, the stronger a penalty is applied to previously present tokens, proportional to how many times they already appeared in the prompt or in prior generations. Minimum value is 0.0 . Maximum value is 1.0 .
   */
  global Double frequencyPenalty;

  /**
   * Maximum number of tokens to generate.
   */
  global Integer maxTokens;

  /**
   * Number of generation requests to send to the LLM provider.
   */
  global Integer numGenerations;

  /**
   * Use to reduce the repetitiveness of generated tokens. This value is similar to frequency penalty, except that this penalty is applied equally to all tokens that already appeared, regardless of their exact frequencies. Minimum value is 0.0 , and maximum value is 1.0 .
   */
  global Double presencePenalty;

  /**
   * Generated text is cut at the end of the earliest occurrence of a stop sequence.
   */
  global List < String > stopSequences;

  /**
   * Sampling temperature to use. Higher values mean the model takes more risks. Lower temperatures mean that generations are less random. Minimum value is 0.0 , and maximum value is 1.0
   */
  global Double temperature;

}