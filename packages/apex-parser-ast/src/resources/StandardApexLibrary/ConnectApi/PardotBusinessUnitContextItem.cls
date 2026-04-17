/**
 * Pardot business unit context item.
 */
global class PardotBusinessUnitContextItem {

  /**
   * ID of the PardotTenant record.
   */
  global String id;

  /**
   * Specifies whether the business unit is selected as the context user's current business unit context in the business unit switcher of the Pardot Lightning app ( true ) or not ( false ).
   */
  global Boolean isCurrent;

  /**
   * Name of the Pardot business unit as it is specified in the MasterLabel of the PardotTenant record.
   */
  global String name;

}