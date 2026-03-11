/**
 * A set of inventory availability data for one inventory location group.
 */
global class OCILocationGroupAvailabilityOutputRepresentation {

  /**
   * A list of availability data for individual products. The data combines the quantities for all locations belonging to this location group.
   */
  global List < ConnectApi.OCIInventoryRecordOutputRepresentation > inventoryRecords;

  /**
   * The identifier of the location group.
   */
  global String locationGroupIdentifier;

}