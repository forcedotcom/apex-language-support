/**
 * Creates Account records that will be associated with Chatter Answers users.
 */
global interface AccountCreator {

  /**
   * Accepts basic user information and creates an Account record. The implementation of this method returns the account ID.
   * @param firstName The first name of the user who is registering.
   * @param lastName The last name of the user who is registering.
   * @param siteAdminId The user ID of the Site administrator, used for notification if any exceptions occur.
   * @return String
   */
  String createAccount(String firstName, String lastName, Id siteAdminId);

}