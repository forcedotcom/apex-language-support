/**
 * Context based on which the survey invitation is sent to a participant.
 */
global class RecipientEngagementContextInput {

  /**
   * Map each recipient with the context based on which the survey invitation is emailed.
   */
  global Map < String , String > recipientEngagementContext;

  /**
   * Participant ID with whom the engagement context should be associated.
   */
  global String recipientId;

}