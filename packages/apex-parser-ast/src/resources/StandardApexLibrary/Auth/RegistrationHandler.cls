/**
 * Salesforce provides the ability to use an authentication provider, such as Facebook© or Janrain©, for single sign-on into Salesforce.
 */
global interface RegistrationHandler {

  /**
   * Returns a User object using the specified portal ID and user information from the third party, such as the username and email address. The User object corresponds to the third party’s user information. It can be a new user that hasn’t been inserted in your org’s database, or it can represent an existing user record in the database. If it’s a new User object, Salesforce inserts a user record for you.
   * @param portalId 
   * @param userData 
   * @return User
   */
  User createUser(ID portalId, Auth.UserData userData);

  /**
   * Updates the specified user’s information. This method is called if the user has logged in before with the authentication provider and then logs in again.
   * @param userId 
   * @param portalId 
   * @param userData 
   */
  void updateUser(ID userId, ID portalId, Auth.UserData userData);

}