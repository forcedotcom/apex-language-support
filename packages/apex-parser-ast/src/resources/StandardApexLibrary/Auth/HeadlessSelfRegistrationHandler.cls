/**
 * Creates customer and partner users during the Headless Registration Flow.
 * Usage
 * The Headless Registration Flow allows you to control user registration experience in a third-party app while using Salesforce to authenticate users and manage their data access. When you set up this flow, add users in the class that is implementing the Auth.HeadlessSelfRegistrationHandler interface. This class runs after the user verifies their identity. For a detailed explanation of headless registration, see <a class="xref" href="https://help.salesforce.com/s/articleView?id=xcloud.remoteaccess_headless_registration_private_clients.htm&amp;type=5&amp;language=en_US" target="_blank" title="HTML (New Window)">Headless Registration Flow for Private Clients</a> or <a class="xref" href="https://help.salesforce.com/s/articleView?id=xcloud.remoteaccess_headless_registration_public_clients.htm&amp;type=5&amp;language=en_US" target="_blank" title="HTML (New Window)">Headless Registration Flow for Public Clients</a>, depending on your app type.
 */
global interface HeadlessSelfRegistrationHandler {
    /**
     * Returns a User object using information submitted by your off-platform app to Headless Registration API. The User object can be a new user that hasn’t been inserted in your org’s database, or it can represent an existing user record. If it’s a new User object, Salesforce inserts the user record for you.
     */
    abstract User createUser(Id profileId, Auth.UserData data, String customUserDataMap, String experienceId, String password);

    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    virtual String toString();
}