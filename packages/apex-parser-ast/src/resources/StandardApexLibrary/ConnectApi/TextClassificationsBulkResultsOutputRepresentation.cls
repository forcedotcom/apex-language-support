/**
 * Text classification to get results for multiple text classification request IDs.
 */
global class TextClassificationsBulkResultsOutputRepresentation {

  /**
   * List of results for passed request IDs.
   */
  global List < ConnectApi.TextClassificationsResultWithIdOutputRepresentation > resultsList;

}