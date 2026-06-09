/**
 * Use the DomainCreator class to return a hostname specific to the org. For example, get the org’s Visualforce hostname. Values are returned as a hostname, such as MyDomainName .lightning.force.com .
 */
global class DomainCreator {

  global DomainCreator() {}

  global static String getContentHostname() {}

  global static String getExperienceCloudSitesBuilderHostname() {}

  global static String getExperienceCloudSitesHostname() {}

  global static String getExperienceCloudSitesLivePreviewHostname() {}

  global static String getExperienceCloudSitesPreviewHostname() {}

  global static String getLightningContainerComponentHostname(String packageName) {}

  global static String getLightningHostname() {}

  global static String getOrgMyDomainHostname() {}

  global static String getSalesforceSitesHostname() {}

  global static String getSetupHostname() {}

  global static String getVisualforceHostname(String packageName) {}

  global Object clone() {}

}