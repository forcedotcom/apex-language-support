/**
 * Marketing integration form field.
 */
global class FormFieldInput {

  global FormFieldInput() {}

  /**
   * Name of the marketing integration form field.
   */
  global String name;

  /**
   * Type of marketing integration form field. Values are: Boolean Date EmailAddress Number Text
   */
  global ConnectApi.FormFieldType type;

  global Object clone() {}

}