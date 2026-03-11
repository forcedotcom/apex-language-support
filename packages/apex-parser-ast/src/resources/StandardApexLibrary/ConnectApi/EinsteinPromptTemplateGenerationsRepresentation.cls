/**
 * Generated response from the LLM provider and resolved prompt template text.
 */
global class EinsteinPromptTemplateGenerationsRepresentation {

  /**
   * Source information associated with the generated responses.
   */
  global ConnectApi.EinsteinLlmGenerationCitationOutput citations;

  /**
   * File data of the input files used in generation.
   */
  global List < ConnectApi.EinsteinPromptTemplateAttachment > fileData;

  /**
   * List of errors associated with the generated responses, if any.
   */
  global List < ConnectApi.EinsteinPromptTemplateGenerationsError > generationErrors;

  /**
   * List of generated responses from the LLM provider.
   */
  global List < ConnectApi.EinsteinLlmGenerationItemOutput > generations;

  /**
   * Specifies whether the generated response contains summarized text (true) or not (false) .
   */
  global Boolean isSummarized;

  /**
   * Map of parameters and values for the LLM provider parameters.
   */
  global ConnectApi.WrappedMapObject parameters;

  /**
   * Prompt template text with resolved inputs.
   */
  global String prompt;

  /**
   * Developer name or ID of the prompt template record.
   */
  global String promptTemplateDevName;

  /**
   * ID of the generation request sent to the LLM provider.
   */
  global String requestId;

  /**
   * List of resolved prompt templates with masked data and masking information.
   */
  global List < ConnectApi.EinsteinPromptTemplateMaskContent > requestMessages;

  /**
   * List of generated responses with masked data and masking information for the specified prompt template.
   */
  global List < ConnectApi.EinsteinPromptTemplateMaskContent > responseMessages;

  /**
   * List of original and placeholder values of the masked data.
   */
  global List < ConnectApi.EinsteinPromptTemplateMaskData > slotsMaskingInformation;

}