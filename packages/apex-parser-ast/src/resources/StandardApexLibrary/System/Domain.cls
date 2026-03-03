/**
 * Represents an existing domain hosted by Salesforce that serves the org or its content. Contains methods to obtain information about these domains, such as the domain type, My Domain name, and sandbox name.
 */
global class Domain {

  public System.DomainType getDomainType() {}

  public String getMyDomainName() {}

  public String getPackageName() {}

  public String getSandboxName() {}

  public String getSitesSubdomainName() {}

}