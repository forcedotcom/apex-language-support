/**
 * Record field with a label and text value.
 */
global class ReferenceRecordField extends ConnectApi.LabeledRecordField {

  global ReferenceRecordField() {}

  /**
   * Object referenced by the record field.
   */
  global ConnectApi.RecordSummary reference;

  global Object clone() {}

}