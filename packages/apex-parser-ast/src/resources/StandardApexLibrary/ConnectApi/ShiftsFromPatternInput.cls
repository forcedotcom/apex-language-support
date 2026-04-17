/**
 * Shifts from a pattern.
 */
global class ShiftsFromPatternInput {

  /**
   * Scheduling end date in YYYY-MM-DD format. Provide schedulingEndDate or schedulingOccurrences . Don’t provide both.
   */
  global String schedulingEndDate;

  /**
   * Number of scheduling occurrences. Provide schedulingEndDate or schedulingOccurrences . Don’t provide both.
   */
  global Integer schedulingOccurrences;

  /**
   * Scheduling start date in YYYY-MM-DD format.
   */
  global String schedulingStartDate;

  /**
   * ID of the service resource to assign shifts to. In version 53.0 and later, use serviceResourceIdList .
   */
  global String serviceResourceId;

  /**
   * List of service resource IDs to assign shifts to.
   */
  global List < String > serviceResourceIdList;

  /**
   * ID of the service territory to assign shifts to.
   */
  global String serviceTerritoryId;

  /**
   * Status of the shifts. Default values are: Confirmed Published Tentative Additional status values can be created.
   */
  global String shiftStatus;

}