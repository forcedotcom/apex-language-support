/**
 * Results of searching objects using a natural language query.
 */
global class SearchAnswer {

  /**
   * AI generated response.
   */
  global String content;

  /**
   * LLM generation ID used to track any feedback on the conversation.
   */
  global String llmGenerationId;

  /**
   * All search related metadata associated with the objects found in the results.
   */
  global Map < String , ConnectApi.ObjectMetadata > metadata;

  /**
   * Record results for the natural language search.
   */
  global List < ConnectApi.SearchObject > searchObjects;

}