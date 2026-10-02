/**
 * Use this interface to create a headless user discovery handler that you implement during headless login, passwordless login, and forgot password flows.
 * <p>Usage
 * Develop headless authorization flows where users log in to an off-platform app with an identifier other than their username, such as an email address, phone number, or order number. When a user enters the identifier in your headless app, your app sends the identifying information to a Salesforce endpoint. Salesforce then passes the identifying information to your implementation of the Auth.HeadlessUserDiscoveryHandler interface. The handler finds the user's account and its associated email address or phone number.
 * Headless user discovery supports these use cases.
 * Headless login with any identifier and a password. For example, a user goes to your headless app and enters their order number and password to log in.
 * Headless login with any identifier and a one-time password (OTP). For example, a user goes to your app and enters just their order number. Your Apex handler finds the user's account based on the order number. Salesforce sends an OTP to the verified email address that's associated with the account. To log in, the user enters the OTP.
 * Headless password reset with any identifier. For example a user goes to your app and enters their phone number. Your Apex handler finds the user account and Salesforce sends an OTP to the user's verified phone number. To verify their identity for password reset, the user enters the OTP and can then set a new password.
 * Headless user discovery is supported for Headless Identity API flows and OAuth 2.0 for First-Party Applications flows. For more information about supported flows and implementation details, see <a class="xref" href="https://help.salesforce.com/s/articleView?id=xcloud.remoteaccess_headless_discovery.htm&amp;type=5&amp;language=en_US" target="_blank">Headless Login Without a Username</a>.
 */
global interface HeadlessUserDiscoveryHandler {
    /**
     * Finds a user's Salesforce account based on user information, such as their email address, phone number, or other data, that's passed to a Salesforce endpoint during headless login, passwordless login, and forgot password flows.
     * @return If the handler finds a user, it returns a user ID. If not, it returns an error message.
     */
    abstract Auth.HeadlessUserDiscoveryResponse discoverUserFromLoginHint(Id networkId, String loginHint, Auth.VerificationAction verificationAction, String customDataJson, Map requestAttributes);

    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    virtual String toString();
}