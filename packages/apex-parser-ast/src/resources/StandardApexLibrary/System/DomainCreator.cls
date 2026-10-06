/**
 * Use the DomainCreator class to return a hostname specific to the org. For example, get the org’s Visualforce hostname. Values are returned as a hostname, such as MyDomainName.lightning.force.com.
 * Examples
 * This example code fetches the org’s My Domain login hostname and the Visualforce hostname for the uat package.
 * //Get the My Domain login hostname
 * String myDomainHostname = DomainCreator.getOrgMyDomainHostname();
 *
 * //Get the Visualforce hostname
 * String vfHostname = DomainCreator.getVisualforceHostname('uat');
 * In this case, in a production org with a My Domain name of mycompany, myDomainHostname returns mycompany.my.salesforce.com. And in the same production org, vfHostname returns mycompany--uat.vf.force.com.
 * This example code creates a link to a Salesforce Account record. It gets the Lightning hostname associated with this org. It then gets the Account record ID and uses concatenation to build the link URL.
 * //Get the org’s Lightning hostname
 * String myLightningHostname = DomainCreator.getLightningHostname();
 *
 * //Get the ID of a record Account with the name ‘Acme’
 * Account acct = [SELECT Id FROM Account WHERE Name = 'Acme' LIMIT 1];
 *
 * //Build the URL to view the account record
 * String fullRecordURL = 'https://' + myLightningHostname + '/lightning/r/Account/' + acct.Id + '/view';
 */
global class DomainCreator {
    global DomainCreator() { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the hostname for content stored in the org, such as files.
     */
    global static String getContentHostname() { return null; }

    /**
     * Returns the hostname to access Experience Builder for the org’s Experience Cloud sites.
     */
    global static String getExperienceCloudSitesBuilderHostname() { return null; }

    /**
     * Returns the system-managed hostname for the org’s Experience Cloud sites, such as ExperienceCloudSitesSubdomainName.force.com. If Digital Experiences aren’t enabled, this method throws an InvalidParameterValueException.
     */
    global static String getExperienceCloudSitesHostname() { return null; }

    /**
     * Returns the hostname to access Experience Builder Live Preview for the org’s Experience Cloud sites.
     */
    global static String getExperienceCloudSitesLivePreviewHostname() { return null; }

    /**
     * Returns the hostname to access Experience Builder Preview for the org’s Experience Cloud sites.
     */
    global static String getExperienceCloudSitesPreviewHostname() { return null; }

    /**
     * Returns the hostname for the org’s Lightning Container Components.
     */
    global static String getLightningContainerComponentHostname(String packageName) { return null; }

    /**
     * Returns the hostname for the org’s Lightning pages.
     */
    global static String getLightningHostname() { return null; }

    /**
     * Returns the hostname for the org’s My Domain login domain.
     */
    global static String getOrgMyDomainHostname() { return null; }

    /**
     * Returns the hostname for the org’s Salesforce Sites. If Salesforce Sites aren’t enabled, this method throws an InvalidParameterValueException.
     */
    global static String getSalesforceSitesHostname() { return null; }

    /**
     * Returns the hostname for the org’s setup domain, which hosts Setup pages in Salesforce.
     */
    global static String getSetupHostname() { return null; }

    /**
     * Returns the hostname for the org’s Visualforce pages.
     */
    global static String getVisualforceHostname(String packageName) { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}