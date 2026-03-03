/**
 * The handler used to implement the My Domain Login Discovery page, which is an interview-based (two-step) login process. First the user is prompted for a unique identifier such as an email address or phone number. Then the handler determines (discovers) how to authenticate the user. Either the user enters a password or is directed to an identity provider’s login page.
 */
global interface MyDomainLoginDiscoveryHandler {

  /**
   * Log in a Salesforce user given the specified identifier, such as email or phone number. If successful, redirect the user to the page specified by the start URL.
   * @param identifier Identifier the Salesforce user entered at the login prompt, for example, an email address or phone number.
   * @param startUrl The page users see after successfully logging in to the My Domain subdomain.
   * @param String 
   * @param requestAttributes Information about the login request based on the user’s browser state when accessing the login page. requestAttributes passes in the MyDomainUrl, IpAddress, UserAgent, Platform, Application, City, Country, and Subdivision values. The City, Country, and Subdivision values come from IP address geolocation.
   * @return System.PageReference
   */
  System.PageReference login(String identifier, String startUrl, Map< String, String > requestAttributes);

}