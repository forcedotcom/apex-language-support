/**
 * Marketing integration form.
 */
global class FormInput {

  /**
   * Fields for the marketing integration form.
   */
  global List < ConnectApi.FormFieldInput > formFieldsList;

  /**
   * Name of the marketing integration form.
   */
  global String formName;

  /**
   * The member identification code (MID) of the Marketing Cloud Engagement account associated with the form.
   */
  global String memberIdentificationCode;

}