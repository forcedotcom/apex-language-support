/**
 * Salesforce gives you the ability to log in users based on other verification methods than username and password. For example, it can prompt users to log in with their email, phone number, or another identifier like a Federation ID or device identifier. Login Discovery is available to these licenses: Customer Community, Customer Community Plus, External Identity, Partner Community, and Partner Community Plus.
 */
global interface LoginDiscoveryHandler {

  /**
   * Log in the customer or partner given the specified identifier, such as email or phone number. If successful, redirect the user to the Experience Cloud site page specified by the start URL.
   * @param identifier Identifier the customer or partner entered at the login prompt, for example, an email address or phone number.
   * @param startUrl Path to the Experience Cloud site page requested by the customer or partner. The user is redirected to this location after successful login.
   * @param String 
   * @return System.PageReference
   */
  System.PageReference login(String identifier, String startUrl, Map< String);

}