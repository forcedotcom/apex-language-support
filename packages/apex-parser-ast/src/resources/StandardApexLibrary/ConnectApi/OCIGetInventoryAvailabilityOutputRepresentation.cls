/**
 * Response to a request for inventory availability data.
 */
global class OCIGetInventoryAvailabilityOutputRepresentation extends ConnectApi.OCIBaseOutputRepresentation {

  /**
   * A list of inventory availability data for individual location groups.
   */
  global List < ConnectApi.OCILocationGroupAvailabilityOutputRepresentation > locationGroups;

  /**
   * A list of inventory availability data for individual locations.
   */
  global List < ConnectApi.OCILocationAvailabilityOutputRepresentation > locations;

}