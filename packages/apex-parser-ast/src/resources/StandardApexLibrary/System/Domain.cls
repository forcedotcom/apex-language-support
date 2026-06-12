/**
 * Represents an existing domain hosted by Salesforce that serves the org or its content. Contains methods to obtain information about these domains, such as the domain type, My Domain name, and sandbox name.
 */
global class Domain {

  global Domain() {}

  global System.DomainType getDomainType() {}

  global String getMyDomainName() {}

  global String getPackageName() {}

  global String getSandboxName() {}

  global String getSitesSubdomainName() {}

  global Object clone() {}

}