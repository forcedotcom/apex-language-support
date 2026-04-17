/**
 * Create or update the members of a direct message.
 */
global class DirectMessageCapabilityInput {

  /**
   * List of user IDs for members to include in the direct message.
   */
  global List < String > membersToAdd;

  /**
   * List of user IDs for members to remove from the direct message.
   */
  global List < String > membersToRemove;

  /**
   * Subject of the direct message.
   */
  global String subject;

}