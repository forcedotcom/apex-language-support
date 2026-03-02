/**
 * Get a list of prompt templates and generate LLM responses for prompt templates.
 */
public class EinsteinLLM {

  public static ConnectApi.EinsteinPromptTemplateGenerationsRepresentation generateMessagesForPromptTemplate(String promptTemplateDevName, ConnectApi.EinsteinPromptTemplateGenerationsInput promptTemplateGenerationsInput) {}

  public static ConnectApi.EinsteinPromptRecordCollectionOutputRepresentation getPromptTemplates(String query, String sortBy, Integer offset, Integer pageLimit, List< String > fields, String type, String relatedEntity, Boolean isActive) {}

}