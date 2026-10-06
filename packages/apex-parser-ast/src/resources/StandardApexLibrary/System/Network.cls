/**
 * Manage Experience Cloud sites.
 */
global class Network {
    /**
     * Creates a new instance of the System.Network class.
     */
    global Network() { }

    global static System.PageReference communitiesLanding() { return null; }

    /**
     * Asynchronously creates an Experience Cloud site user for the given account or contact and associates it with the site. This method processes requests in batches and then sends an email with login information to the user.
     * @return Returns the UUID for the site user.
     */
    global static String createExternalUserAsync(SObject user, SObject contact, SObject account) { return null; }

    /**
     * Asynchronously creates case, lead, and custom object records. This method collects record creation requests and processes them in batches.
     * @return Returns the UUID for the record created.
     */
    global static String createRecordAsync(String processType, SObject mbObject) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global static System.PageReference forwardToAuthPage(String startUrl) { return null; }

    global static System.PageReference forwardToAuthPage(String startUrl, String displayType) { return null; }

    /**
     * Returns the absolute URL of the login page used by the Experience Cloud site.
     * Usage
     * Returns the full URL for the Lightning Platform or Experience Builder page used as the login page in the Experience Cloud site.
     */
    @AuraEnabled
    global static String getLoginUrl(String networkId) { return null; }

    /**
     * Returns the absolute URL of the logout page used by the Experience Cloud site.
     * Usage
     * Returns the full URL for the Lightning Platform page, Experience Builder page, or Web page used as the logout page in the Experience Cloud site.
     */
    global static String getLogoutUrl(String networkId) { return null; }

    /**
     * Returns the user’s current Experience Cloud site.
     * Usage
     * If digital experiences isn’t enabled for the user’s org or the user is currently in the internal org, returns null.
     */
    @AuraEnabled
    global static String getNetworkId() { return null; }

    /**
     * Returns the absolute URL of the self-registration page used by the Experience Cloud site.
     * Usage
     * Returns the full URL for the Lightning Platform or Experience Builder page used as the self-registration page in the Experience Cloud site.
     */
    global static String getSelfRegUrl(String networkId) { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Maps the dashboards from the Salesforce Communities Management package onto each Experience Cloud site’s unconfigured dashboard settings. Returns the number of settings it configures.
     * Usage
     * If digital experiences is enabled, and the Salesforce Communities Management package is installed, maps the dashboards provided in the package onto each Experience Cloud site’s unconfigured dashboard settings. Returns the number of settings it configures. This method is invoked automatically during site creation and package installation, but isn’t typically invoked manually.
     * If digital experiences isn’t enabled for the user’s org or the user is in the internal org, returns 0.
     */
    global static Integer loadAllPackageDefaultNetworkDashboardSettings() { return 0; }

    /**
     * Maps the Insights reports from the Salesforce Communities Management package onto each Experience Cloud site’s unconfigured Insights settings. Returns the number of settings it configures.
     * Usage
     * If digital experiences is enabled, and the Salesforce Communities Management package is installed, maps the Insights reports provided in the package onto each Experience Cloud site’s unconfigured Insights settings. Returns the number of settings it configures. This method is invoked automatically during site creation and package installation, but isn’t typically invoked manually.
     * If digital experiences isn’t enabled for the user’s org or the user is in the internal org, returns 0.
     */
    global static Integer loadAllPackageDefaultNetworkPulseSettings() { return 0; }

    global static Integer loadAllPackageDefaultNetworkWorkspaceMetricSettings() { return 0; }

    global override virtual String toString() { return null; }
}