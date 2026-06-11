/**
 * Text classification to get results for multiple text classification request IDs.
 */
global class TextClassificationsBulkResultsOutputRepresentation {

  global TextClassificationsBulkResultsOutputRepresentation() {}

  /**
   * List of results for passed request IDs.
   */
  global List < ConnectApi.TextClassificationsResultWithIdOutputRepresentation > resultsList;

  global Object clone() {}

}