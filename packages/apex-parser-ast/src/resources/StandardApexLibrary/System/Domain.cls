/**
 * Represents an existing domain hosted by Salesforce that serves the org or its content. Contains methods to obtain information about these domains, such as the domain type, My Domain name, and sandbox name.
 * <p>Usage
 * Use the Domain class to obtain information about the domains that Salesforce hosts for your org. This class only applies to domains hosted by Salesforce, and can’t be used to generate a new domain.
 * <p>Example
 * This code uses the System.DomainParser class to parse a hostname. It then gets the associated domain type.
 * System.Domain d = DomainParser.parse('mycompany.lightning.force.com');
 * String myDomainName = d.getMyDomainName();
 * System.DomainType domainType = d.getDomainType();
 */
global class Domain {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the domain’s type, such as CONTENT_DOMAIN, EXPERIENCE_CLOUD_SITES_DOMAIN, or LIGHTNING_DOMAIN.
     */
    global System.DomainType getDomainType() { return null; }

    /**
     * Returns the domain’s My Domain name.
     */
    global String getMyDomainName() { return null; }

    /**
     * For a domain that includes the package name, such as a Lightning Component domain or Visualforce page domain, returns the package name. For a domain that doesn’t contain a package name, this method returns null.
     */
    global String getPackageName() { return null; }

    /**
     * For a sandbox org domain, returns the sandbox name. For a production org domain, returns null.
     */
    global String getSandboxName() { return null; }

    /**
     * For a system-managed Experience Cloud site domain or Salesforce Site domain, returns the sites subdomain name. If <a class="xref" href="https://help.salesforce.com/s/articleView?id=domain_name_enhanced.htm&amp;language=en_US" target="_blank">enhanced domains</a> are enabled, this method always returns null. When enhanced domains are enabled, the org’s My Domain name is the subdomain for the system-managed domains for Experience Cloud sites and Salesforce Sites domains.
     */
    global String getSitesSubdomainName() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}