/**
 * Marketing integration form submission.
 */
global class FormSubmissionInput {

  global FormSubmissionInput() {}

  /**
   * Fields for the marketing integration form.
   */
  global List < ConnectApi.FormFieldSubmissionInput > formFieldsList;

  global Object clone() {}

}