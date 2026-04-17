/**
 * Text classifications result.
 */
global class TextClassificationsResultOutputRepresentation {

  /**
   * List of classifications that each text string was given after analysis.
   */
  global List < ConnectApi.ClassificationsOutputRepresentation > classifications;

  /**
   * Response ID to receive feedback for classification.
   */
  global String classificationsId;

}