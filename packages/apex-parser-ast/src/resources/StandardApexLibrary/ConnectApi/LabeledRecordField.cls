/**
 * Record field containing a label and a text value.
 */
global class LabeledRecordField {

  /**
   * Localized string describing the record field.
   */
  global String label;

  /**
   * Text value of the record field. All record fields have a text value. To ensure that all clients can consume new content, inspect the record field’s type property. If it isn’t recognized, render the text value as the default case.
   */
  global String text;

}