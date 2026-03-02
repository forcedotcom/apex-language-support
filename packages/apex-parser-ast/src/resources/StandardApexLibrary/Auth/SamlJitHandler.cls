/**
 * Use this interface to control and customize Just-in-Time user provisioning logic during SAML single sign-on.
 */
public interface SamlJitHandler {

  /**
   * Returns a User object using the specified Federation ID. The User object corresponds to the user information. This object can be a new user that hasn’t been inserted in the database or an existing user record in the database.
   * @param samlSsoProviderId The ID of the SamlSsoConfig standard object.
   * @param communityId The ID of the Experience Cloud site. This parameter can be null if you’re not creating an Experience Cloud user.
   * @param portalId The ID of the portal. This parameter can be null if you’re not creating a portal user.
   * @param federationId The ID Salesforce expects to be used for this user.
   * @param String 
   * @param attributes All attributes in the SAML assertion that were added to the default assertion; for example, custom attributes. Attributes are case-sensitive.
   * @param assertion The default SAML assertion, base-64 encoded.
   * @return User
   */
  User createUser(Id samlSsoProviderId, Id communityId, Id portalId, String federationId, Map< String, String > attributes, String assertion);

  /**
   * Updates the specified user’s information. This method is called if the user has logged in before with SAML single sign-on and then logs in again, or if your application is using the Existing User Linking URL .
   * @param userId The ID of the Salesforce user.
   * @param samlSsoProviderId The ID of the SamlSsoConfig object.
   * @param communityId The ID of the Experience Cloud site. This type can be null if you’re not updating an Experience Cloud user.
   * @param portalId The ID of the portal. This type can be null if you’re not updating a portal user.
   * @param federationId The ID Salesforce expects to be used for this user.
   * @param String 
   * @param attributes All attributes in the SAML assertion that were added to the default assertion; for example, custom attributes. Attributes are case-sensitive.
   * @param assertion The default SAML assertion, base-64 encoded.
   */
  void updateUser(Id userId, Id samlSsoProviderId, Id communityId, Id portalId, String federationId, Map< String, String > attributes, String assertion);

}