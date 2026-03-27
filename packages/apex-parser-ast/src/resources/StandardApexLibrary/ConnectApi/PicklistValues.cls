/**
 * Picklist values for a field, scoped to a record type. If a picklist is dependent, this response includes the values of its immediate controlling field and how they map to the picklist.
 */
global class PicklistValues {

  /**
   * If the picklist is dependent, this property is a map of its immediate controlling field’s picklist values to their indexes. If the controlling field is a picklist, the string is the picklist value and the integer is the value’s index. If the controlling field is a checkbox, the values in the map are "false": 0 and "true": 1 . If the picklist is independent, the map is empty.
   */
  global Map < String , Integer > controllerValues;

  /**
   * Default value for the picklist, or null if there isn’t one.
   */
  global ConnectApi.PicklistValue defaultValue;

  /**
   * User Interface API resource that represents this payload.
   */
  global String url;

  /**
   * List of values for this object, record type, field combination.
   */
  global List < ConnectApi.PicklistValue > values;

}