/**
 * An invitation.
 */
global class InviteInput {

  /**
   * List of email addresses to send the invitation to.
   */
  global List < String > invitees;

  /**
   * Message to include in the invitation.
   */
  global String message;

}