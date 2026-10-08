/**
 * Salesforce gives you the ability to log in users based on other verification methods than username and password. For example, it can prompt users to log in with their email, phone number, or another identifier like a Federation ID or device identifier. Login Discovery is available to these licenses: Customer Community, Customer Community Plus, External Identity, Partner Community, and Partner Community Plus.
 * Usage
 * Implement a Auth.LoginDiscoveryHandler for an interview-based log in. The handler looks up a user from the identifier entered, and can call Site.passwordlessLogin to determine which credential to use, such as email or SMS. Or the handler can redirect a user to a third-party identity provider for login. With this handler, the login page doesn't show a password field. However, you can use Site.passwordlessLogin to then prompt for a password.
 * From the user perspective, the user enters an identifier at the log in prompt. Then the user completes the login by entering a PIN or password. Or, if SSO-enabled, the user bypasses login.
 * For an example, see LoginDiscoveryHandler Example Implementation. For more details, see <a class="xref" href="https://help.salesforce.com/articleView?id=identity_about_customers_partners.htm&amp;language=en_US" target="_blank" title="HTML (New Window)">Salesforce Customer Identity</a> in Salesforce Help.
 */
global interface LoginDiscoveryHandler {
    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    abstract System.PageReference login(String identifier, String startUrl, Map requestAttributes);

    virtual String toString();
}