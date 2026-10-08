/**
 * The handler used to implement the My Domain Login Discovery page, which is an interview-based (two-step) login process. First the user is prompted for a unique identifier such as an email address or phone number. Then the handler determines (discovers) how to authenticate the user. Either the user enters a password or is directed to an identity provider’s login page.
 * Usage
 * Implement MyDomainLoginDiscoveryHandler to let My Domain users log in with something other than their username and password. This handler contains the logic to look up the user based on the identifier value entered on the login page. The Auth.MyDomainLoginDiscoveryHandler.login method is invoked when the identifier page is submitted and finds the user that corresponds to the submitted identifier. The Auth.SessionManagement.finishLoginDiscovery method sends the user to the authentication mechanism and then logs in the user.
 * Register the handler from the My Domain Setup page. Under Authentication Configuration, select the Discovery Login Page Type. For Login Discovery Handler, select this handler from the list of Apex classes.
 * For an example, see MyDomainLoginDiscoveryHandler Example Implementation. For more details, search for My Domain Login Discovery in Salesforce Help.
 */
global interface MyDomainLoginDiscoveryHandler {
    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    /**
     * Log in a Salesforce user given the specified identifier, such as email or phone number. If successful, redirect the user to the page specified by the start URL.
     * Example
     * Here’s a sample requestAttributes response.
     * CommunityUrl=http://my-dev-ed.my.salesforce.com:5555/discover
     * IpAddress=55.255.0.0
     * UserAgent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/11.1 Safari/605.1.15
     * Platform=Mac OSX
     * Application=Browser
     * City=San Mateo
     * Country=United States
     * Subdivision=California
     * @return The URL of the page where the user is redirected to complete authentication.
     */
    abstract System.PageReference login(String identifier, String startUrl, Map requestAttributes);

    virtual String toString();
}