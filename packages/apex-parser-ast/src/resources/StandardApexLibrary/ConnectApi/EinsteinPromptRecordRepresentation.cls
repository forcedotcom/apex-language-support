/**
 * Prompt template record.
 */
global class EinsteinPromptRecordRepresentation {

  /**
   * API name of the prompt template record.
   */
  global String apiName;

  /**
   * Map of prompt template name and prompt template records that are versions of the prompt template.
   */
  global Map < String , ConnectApi.EinsteinPromptRecordRepresentation > childRelationships;

  /**
   * Map of field name and prompt template record fields.
   */
  global Map < String , ConnectApi.EinsteinPromptRecordFieldRepresentation > fields;

  /**
   * ID of the prompt template record.
   */
  global String id;

  /**
   * Specifies whether the prompt template record is a standard prompt template (true) or user-created prompt template (false) .
   */
  global Boolean isStandard;

}