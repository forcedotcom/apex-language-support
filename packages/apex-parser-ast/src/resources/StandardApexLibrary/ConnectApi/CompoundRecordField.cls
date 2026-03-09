/**
 * Record field that is a composite of subfields.
 */
global class CompoundRecordField extends ConnectApi.LabeledRecordField {

  /**
   * Collection of subfields that make up the compound field.
   */
  global List < ConnectApi.AbstractRecordField > fields;

}