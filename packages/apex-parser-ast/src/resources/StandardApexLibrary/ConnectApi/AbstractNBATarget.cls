/**
 * A recommendation target of a recommendation strategy.
 */
global class AbstractNBATarget {

  global AbstractNBATarget() {}

  /**
   * Type of target. Values are: Recommendation
   */
  global ConnectApi.NBATargetType type;

  global Object clone() {}

}