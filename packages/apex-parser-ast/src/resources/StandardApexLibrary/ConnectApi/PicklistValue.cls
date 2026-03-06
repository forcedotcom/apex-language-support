/**
 * Picklist value.
 */
global class PicklistValue {

  /**
   * Picklist value attributes.
   */
  global ConnectApi.AbstractPicklistValueAttributes attributes;

  /**
   * Displayable value of the picklist to use.
   */
  global String label;

  /**
   * If the picklist is a dependent picklist, the property contains a list of the controlling value indexes for which this value is valid. If the picklist is an independent picklist, the list is empty.
   */
  global List < Integer > validFor;

  /**
   * Value of the picklist to use.
   */
  global String value;

}