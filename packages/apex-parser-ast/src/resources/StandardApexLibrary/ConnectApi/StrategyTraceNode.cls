/**
 * A trace node for a recommendation strategy execution.
 */
global class StrategyTraceNode {

  /**
   * Number of items put into the node.
   */
  global Integer inputCount;

  /**
   * Messages that occurred during node execution.
   */
  global List < String > messages;

  /**
   * Name of the node.
   */
  global String nodeName;

  /**
   * Time spent processing inside the node.
   */
  global Long nodeTime;

  /**
   * Type of node.
   */
  global String nodeType;

  /**
   * Number of items returned from the node.
   */
  global Integer outputCount;

  /**
   * Recommendations that are returned from the node.
   */
  global List < String > outputs;

  /**
   * Total time spent processing.
   */
  global Long totalTime;

}