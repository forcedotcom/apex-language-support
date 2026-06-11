/**
 * Record field containing a percentage value.
 */
global class PercentRecordField extends ConnectApi.LabeledRecordField {

  global PercentRecordField() {}

  /**
   * Value of the percentage.
   */
  global Double value;

  global Object clone() {}

}