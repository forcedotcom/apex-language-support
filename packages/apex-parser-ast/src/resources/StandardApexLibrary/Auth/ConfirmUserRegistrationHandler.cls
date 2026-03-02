/**
 * Manages single sign-on (SSO) user mappings between Salesforce and a third-party identity provider. Use this interface to confirm user mappings before updating them.
 */
public interface ConfirmUserRegistrationHandler {

  Id confirmUser(Id userId, Id tpalId, Id portalId, Auth.UserData userdata);

}