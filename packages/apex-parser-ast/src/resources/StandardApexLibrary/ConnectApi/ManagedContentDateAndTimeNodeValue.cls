/**
 * Managed content node of date and time type.
 */
global class ManagedContentDateAndTimeNodeValue extends ConnectApi.ManagedContentNodeValue {

  /**
   * UTC date and time value of the managed content node.
   */
  global Datetime dateTimeValue;

  /**
   * Time zone in which the date and time is authored.
   */
  global String timeZone;

}