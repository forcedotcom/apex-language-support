/**
 * Manage Experience Cloud sites.
 */
public class Network {

  /**
   * Returns a Page Reference to the default landing page for the Experience Cloud site. This is the first tab of the site.
   * @return String
   */
  public static String communitiesLanding() {}

  public static String createExternalUserAsync(SObject user, SObject contact, SObject account) {}

  public static String createRecordAsync(String processType, SObject mbObject) {}

  /**
   * Returns a Page Reference to the default login page. StartURL is included as a query paremeter for where to redirect after a successful login.
   * @param startURL 
   * @return PageReference
   */
  public static PageReference forwardToAuthPage(String startURL) {}

  /**
   * Returns the absolute URL of the login page used by the Experience Cloud site.
   * @param networkId The ID of the Experience Cloud site you’re retrieving this information for.
   * @return String
   */
  public static String getLoginUrl(String networkId) {}

  /**
   * Returns the absolute URL of the logout page used by the Experience Cloud site.
   * @param networkId The ID of the Experience Cloud site you’re retrieving this information for.
   * @return String
   */
  public static String getLogoutUrl(String networkId) {}

  /**
   * Returns the user’s current Experience Cloud site.
   * @return String
   */
  public static String getNetworkId() {}

  /**
   * Returns the absolute URL of the self-registration page used by the Experience Cloud site.
   * @param networkId The ID of the Experience Cloud site you’re retrieving this information for.
   * @return String
   */
  public static String getSelfRegUrl(String networkId) {}

  /**
   * Maps the dashboards from the Salesforce Communities Management package onto each Experience Cloud site’s unconfigured dashboard settings. Returns the number of settings it configures.
   * @return Integer
   */
  public static Integer loadAllPackageDefaultNetworkDashboardSettings() {}

  /**
   * Maps the Insights reports from the Salesforce Communities Management package onto each Experience Cloud site’s unconfigured Insights settings. Returns the number of settings it configures.
   * @return Integer
   */
  public static Integer loadAllPackageDefaultNetworkPulseSettings() {}

}