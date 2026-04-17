/**
 * Collection of picklist values for all the picklists of a record type.
 */
global class PicklistValuesCollection {

  /**
   * A map of field names to picklist values. The map contains all the picklist values for all the picklists of a record type, including dependent picklists. If a field isn’t a picklist, it isn’t represented in the map.
   */
  global Map < String , ConnectApi.PicklistValues > picklistFieldValues;

}