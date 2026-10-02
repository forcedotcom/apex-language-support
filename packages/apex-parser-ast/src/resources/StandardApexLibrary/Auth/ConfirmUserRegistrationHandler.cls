/**
 * Manages single sign-on (SSO) user mappings between Salesforce and a third-party identity provider. Use this interface to confirm user mappings before updating them.
 * <p>Usage
 * When you set up SSO with a third-party identity provider, you create a class that implements a registration handler using the Auth.RegistrationHandler interface. This class manages the process of creating and updating users. For advanced use cases that require you to confirm user information during the update process, implement the Auth.ConfirmUserRegistrationHandler interface in your class. This interface must be implemented in addition to Auth.RegistrationHandler.
 * You can use the Auth.ConfirmUserRegistrationHandler interface to ensure that users are mapped correctly between Salesforce and the third party. When a user who has previously logged in with an authentication provider logs in again, you can confirm that the incoming user data is consistent with the user's third-party identifier. If not, you can identify which user is supposed to be logged in.
 * You can also use the Auth.ConfirmUserRegistrationHandler interface to switch context for users with multiple records. For example, a user has two records—an admin user and a standard user. When the user logs in, the third-party identity provider confirms the account used to log in and sends the response to Salesforce via the <a class="xref" href="https://help.salesforce.com/s/articleView?id=xcloud.remoteaccess_using_userinfo_endpoint.htm&amp;type=5&amp;language=en_US" target="_blank" title="HTML (New Window)">UserInfo endpoint</a>. You can then use this information to determine whether to log in the user as an admin or standard user.
 */
global interface ConfirmUserRegistrationHandler {
    /**
     * Returns the ID of the user to be logged in based on their mapping to a third-party identifier. This method is called before calling the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexref.meta/apexref/apex_auth_plugin.htm#apex_Auth_RegistrationHandler_updateUser" target="_blank" title="HTML (New Window)">updateUser()</a> method. It's called only if the incoming user has previously logged in and has a third-party account link to a Salesforce user.
     * @return The Id of the user to be logged in. If null, login fails.
     */
    abstract Id confirmUser(Id userId, Id tpalId, Id portalId, Auth.UserData data);

    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    virtual String toString();
}