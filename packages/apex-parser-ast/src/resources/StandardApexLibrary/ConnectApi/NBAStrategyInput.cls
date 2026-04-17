/**
 * A recommendation strategy.
 */
global class NBAStrategyInput {

  /**
   * ID of the context record. For example, if the next best action is on a case detail page, the ID of the case.
   */
  global String contextRecordId;

  /**
   * Maximum number of results. Valid values are from 1 to 25. The default is 3.
   */
  global Integer maxResults;

  /**
   * Variable and value mappings for the strategy.
   */
  global Map < String , String > strategyContext;

  /**
   * Specifies whether to return trace and debug information in the response ( true ) or not ( false ). If unspecified, the default is false .
   */
  global Boolean debugTrace;

}