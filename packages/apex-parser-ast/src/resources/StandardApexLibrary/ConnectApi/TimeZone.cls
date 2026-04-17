/**
 * User's time zone as selected in the user’s personal settings in Salesforce. This value doesn’t reflect a device's current location.
 */
global class TimeZone {

  /**
   * Signed offset, in hours, from GMT.
   */
  global Double gmtOffset;

  /**
   * Display name of this time zone.
   */
  global String name;

}