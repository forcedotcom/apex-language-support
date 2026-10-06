/**
 * Use the DomainParser class to parse a domain that Salesforce hosts for the org and extract information about the domain.
 * Examples
 * This example code parses the org’s Lightning domain and gets the My Domain name and domain type from the System.Domain object.
 * System.Domain d = DomainParser.parse('mycompany.lightning.force.com');
 * String myDomainName = d.getMyDomainName();
 * System.DomainType domainType = d.getDomainType();
 * This example code parses a known Visualforce URL to get the domain type, the org’s My Domain name, and the package name.
 * //Parse a known URL
 * System.Domain domain = DomainParser.parse('https://mycompany--abcpackage.vf.force.com');
 *
 * //Get the domain type
 * System.DomainType domainType = domain.getDomainType(); // Returns VISUALFORCE_DOMAIN
 *
 * //Get the org’s My Domain name
 * String myDomainName = domain.getMyDomainName(); // Returns mycompany
 *
 * //Get the package name
 * String packageName = domain.getPackageName(); // Returns abcpackage
 */
global class DomainParser {
    global DomainParser() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Parses a passed hostname of a domain that Salesforce hosts for the org, and returns the System.Domain.
     */
    global static System.Domain parse(String hostname) { return null; }

    /**
     * Parses a passed uniform resource locator (URL) of a domain that Salesforce hosts for the org, and returns the System.Domain.
     */
    global static System.Domain parse(System.Url url) { return null; }

    global override virtual String toString() { return null; }
}