/**
 * Classified text with status and text classification request IDs.
 */
global class TextClassificationsResultWithIdOutputRepresentation {

  /**
   * Request ID for text classifications.
   */
  global String id;

  /**
   * Result for text classifications.
   */
  global ConnectApi.TextClassificationsResultOutputRepresentation result;

  /**
   * Request status for text classification.
   */
  global String status;

}