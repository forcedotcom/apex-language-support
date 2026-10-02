/**
 * Use this interface to control and customize Just-in-Time user provisioning logic during SAML single sign-on.
 * <p>Usage
 * To use custom logic for user provisioning during SAML single sign-on, you must create a class that implements Auth.SamlJitHandler. This allows you to incorporate organization-specific logic (such as populating custom fields) when users log in to Salesforce with single sign-on. Keep in mind that your class must perform the logic of creating and updating user data as appropriate, including any associated account and contact records.
 * In Salesforce, you specify your class that implements this interface in the SAML JIT Handler field in SAML Single Sign-On Settings. Make sure that the user you specify to run the class has “Manage Users” permission.
 */
global interface SamlJitHandler {
    /**
     * Returns a User object using the specified Federation ID. The User object corresponds to the user information. This object can be a new user that hasn’t been inserted in the database or an existing user record in the database.
     * <p>Usage
     * The communityId and portalId parameter values can be null or the associated keys can be empty if there’s no Experience Cloud site or portal configured with this organization.
     * @return A User sObject.
     */
    abstract User createUser(Id samlSsoProviderId, Id communityId, Id portalId, String federationIdentifier, Map attributes, String assertion);

    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    virtual String toString();

    /**
     * Updates the specified user’s information. This method is called if the user has logged in before with SAML single sign-on and then logs in again, or if your application is using the Existing User Linking URL.
     */
    abstract void updateUser(Id userId, Id samlSsoProviderId, Id communityId, Id portalId, String federationIdentifier, Map attributes, String assertion);
}