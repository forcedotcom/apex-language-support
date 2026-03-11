/**
 * Represents a collection of activations.
 */
global class ActivationCollection {

  /**
   * List of activations.
   */
  global List < ConnectApi.ActivationRepresentation > activations;

  /**
   * Number of results returned. If unspecified, the default value is 20 .
   */
  global Integer batchSize;

  /**
   * Number of records to skip for the next request.
   */
  global Integer offset;

  /**
   * Sort order for the result set.
   */
  global String orderByExpression;

}