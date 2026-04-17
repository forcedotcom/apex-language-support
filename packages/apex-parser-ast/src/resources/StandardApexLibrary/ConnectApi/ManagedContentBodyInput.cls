/**
 * Input representation for the body of a piece of managed content.
 */
global class ManagedContentBodyInput {

  /**
   * Body of the managed content version. The format must be Map<String, Object> , where map values are either primitive values like String, Integer, Double, Boolean, or another Map<String, Object>.
   */
  global Object nodeMap;

}