/**
 * Prompt template input parameters to use for generation.
 */
global class EinsteinPromptTemplateGenerationsInput {

  /**
   * Configuration information for the LLM provider.
   */
  global ConnectApi.EinsteinLlmAdditionalConfigInput additionalConfig;

  /**
   * Mode of citations for the specified prompt template. Valid values are: post_generation —Citations are generated after the generated response for the specified prompt template. off —Citations aren't generated for the specified prompt template.
   */
  global String citationMode;

  /**
   * Parameters and values to resolve the specified prompt template.
   */
  global Map < String , ConnectApi.WrappedValue > inputParams;

  /**
   * Specifies whether to only resolve the prompt template ( true ) or to resolve the prompt template and generate an LLM response ( false ).
   */
  global Boolean isPreview;

  /**
   * Language code for the language to generate the LLM response in. See Supported Languages in Prompt Template Responses .
   */
  global String outputLanguage;

  /**
   * Map of wrapped values, such as free-form user feedback, that can be used to resolve a specified prompt template.
   */
  global ConnectApi.WrappedValue tags;

}