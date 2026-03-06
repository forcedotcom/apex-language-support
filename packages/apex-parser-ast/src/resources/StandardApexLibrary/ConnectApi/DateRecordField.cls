/**
 * Record field containing a date.
 */
global class DateRecordField {

  /**
   * Date that a machine can read. Ignore the trailing 00:00:00.000Z characters.
   */
  global Datetime dateValue;

}