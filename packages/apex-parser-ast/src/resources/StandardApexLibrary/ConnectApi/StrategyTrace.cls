/**
 * Messages and trace nodes for a recommendation strategy execution.
 */
global class StrategyTrace {

  /**
   * Messages and errors from the strategy execution.
   */
  global List < String > messages;

  /**
   * Nodes of the strategy execution used for debugging.
   */
  global List < ConnectApi.StrategyTraceNode > nodes;

}