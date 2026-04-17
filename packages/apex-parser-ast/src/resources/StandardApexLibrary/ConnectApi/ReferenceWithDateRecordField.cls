/**
 * Record field containing a referenced object that acted at a specific time, for example, “Created By...”.
 */
global class ReferenceWithDateRecordField extends ConnectApi.LabeledRecordField {

  /**
   * Time at which the referenced object acted.
   */
  global Datetime dateValue;

  /**
   * Object referenced by the record field.
   */
  global ConnectApi.RecordSummary reference;

}