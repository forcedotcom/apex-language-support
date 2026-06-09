/**
 * Use the DomainParser class to parse a domain that Salesforce hosts for the org and extract information about the domain.
 */
global class DomainParser {

  global DomainParser() {}

  global static System.Domain parse(String hostname) {}

  global static System.Domain parse(System.URL url) {}

  global Object clone() {}

}