/**
 * Information about whether a proposed mention is valid for the context user.
 */
global class MentionValidation {

  /**
   * The ID of the mentioned record.
   */
  global String recordId;

  /**
   * Type of validation error for a proposed mention, if any. Disallowed —The proposed mention is invalid and is rejected because the context user is trying to mention something that is not allowed. For example, a user who is not a member of a private group is trying to mention the private group. Inaccessible —The proposed mention is allowed, but the user or record being mentioned isn’t notified. They don't have access to the parent record that’s being discussed. Ok —There is no validation error for this proposed mention.
   */
  global ConnectApi.MentionValidationStatus Enum validationStatus;

}