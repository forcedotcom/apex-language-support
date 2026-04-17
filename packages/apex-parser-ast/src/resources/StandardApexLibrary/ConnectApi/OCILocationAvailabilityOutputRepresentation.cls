/**
 * A set of inventory availability data for one inventory location.
 */
global class OCILocationAvailabilityOutputRepresentation {

  /**
   * A list of availability data for individual products at this location.
   */
  global List < ConnectApi.OCIInventoryRecordOutputRepresentation > inventoryRecords;

  /**
   * The identifier of the location.
   */
  global String locationIdentifier;

}