/**
 * Salesforce provides the ability to use an authentication provider, such as Facebook© or Janrain©, for single sign-on into Salesforce.
 * <p>Usage
 * To set up single sign-on, you must create a class that implements Auth.RegistrationHandler. Classes implementing the Auth.RegistrationHandler interface are specified as the Registration Handler in authentication provider definitions, and enable single sign-on into Salesforce portals and organizations from third-party services such as Facebook. Using information from the authentication providers, your class must perform the logic of creating and updating user data as appropriate, including any associated account and contact records.
 * Note
 * During the user update process, you can use the confirmUser() method to ensure that users are correctly mapped between Salesforce and the third party. For more information, see the ConfirmUserRegistrationHandler Interface.
 */
global interface RegistrationHandler {
    /**
     * Returns a User object using the specified portal ID and user information from the third party, such as the username and email address. The User object corresponds to the third party’s user information. It can be a new user that hasn’t been inserted in your org’s database, or it can represent an existing user record in the database. If it’s a new User object, Salesforce inserts a user record for you.
     * <p>Usage
     * The portalID value can be null or an empty key if there’s no portal configured with this provider.
     */
    abstract User createUser(Id portalId, Auth.UserData data);

    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    virtual String toString();

    /**
     * Updates the specified user’s information. This method is called if the user has logged in before with the authentication provider and then logs in again.
     * <p>Usage
     * The portalID value can be null or an empty key if there's no portal configured with this provider.
     */
    abstract void updateUser(Id portalId, Id userId, Auth.UserData data);
}