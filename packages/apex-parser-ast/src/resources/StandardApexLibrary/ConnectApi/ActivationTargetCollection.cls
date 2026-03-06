/**
 * Represents a collection of activation targets.
 */
global class ActivationTargetCollection {

  /**
   * List of activation targets.
   */
  global List < ConnectApi.ActivationTarget > activationTargets;

  /**
   * Number of results returned. Values are from 1 through 200 .
   */
  global Integer batchSize;

  /**
   * Start offset of the next batch of results.
   */
  global Integer offset;

  /**
   * Expression that determines the order of the results.
   */
  global String orderByExpression;

}