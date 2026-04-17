/**
 * Shifts created from a pattern.
 */
global class ShiftsFromPattern {

  /**
   * Total count of created shifts.
   */
  global Integer count;

  /**
   * Error details for shifts from a pattern.
   */
  global ConnectApi.ShiftsFromPatternError error;

  /**
   * Indicates if the request is successful ( true ) or not ( false ).
   */
  global Boolean isSuccess;

  /**
   * Collection of created shift IDs.
   */
  global List < String > recordIds;

}