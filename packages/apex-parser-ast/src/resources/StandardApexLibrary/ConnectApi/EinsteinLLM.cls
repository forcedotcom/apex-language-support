/**
 * Get a list of prompt templates and generate LLM responses for prompt templates.
 */
global class EinsteinLLM {

  global EinsteinLLM() {}

  global static ConnectApi.EinsteinPromptTemplateGenerationsRepresentation generateMessagesForPromptTemplate(String promptTemplateDevName, ConnectApi.EinsteinPromptTemplateGenerationsInput promptTemplateGenerationsInput) {}

  global static ConnectApi.EinsteinPromptRecordCollectionOutputRepresentation getPromptTemplates(String query, String sortBy, Integer offset, Integer pageLimit, List<String> fields, String type, String relatedEntity, Boolean isActive) {}

  global Object clone() {}

}