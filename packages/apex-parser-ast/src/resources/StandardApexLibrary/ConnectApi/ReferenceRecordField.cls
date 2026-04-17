/**
 * Record field with a label and text value.
 */
global class ReferenceRecordField extends ConnectApi.LabeledRecordField {

  /**
   * Object referenced by the record field.
   */
  global ConnectApi.RecordSummary reference;

}