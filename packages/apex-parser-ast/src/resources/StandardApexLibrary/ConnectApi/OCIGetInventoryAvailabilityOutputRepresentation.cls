/**
 * Response to a request for inventory availability data.
 */
global class OCIGetInventoryAvailabilityOutputRepresentation extends ConnectApi.OCIBaseOutputRepresentation {

  global OCIGetInventoryAvailabilityOutputRepresentation() {}

  /**
   * A list of inventory availability data for individual location groups.
   */
  global List < ConnectApi.OCILocationGroupAvailabilityOutputRepresentation > locationGroups;

  /**
   * A list of inventory availability data for individual locations.
   */
  global List < ConnectApi.OCILocationAvailabilityOutputRepresentation > locations;

  global Object clone() {}

}