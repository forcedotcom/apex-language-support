/**
 * Generated response with masked data and masking information for a prompt template.
 */
global class EinsteinPromptTemplateMaskContentRepresentation {

  /**
   * Text of generated response or resolved prompt template with masked data.
   */
  global String content;

  /**
   * Data masking settings for the specified prompt template.
   */
  global ConnectApi.EinsteinPromptTemplateMaskSettingsRepresentation moderationSettings;

  /**
   * Role in the Salesforce role hierarchy of the user executing the prompt template.
   */
  global String role;

}