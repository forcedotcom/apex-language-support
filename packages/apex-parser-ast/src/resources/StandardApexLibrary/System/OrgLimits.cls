/**
 * Contains methods that provide a list or map of all OrgLimit instances for Salesforce your org, such as SOAP API requests, Bulk API requests, and Streaming API limits.
 */
global class OrgLimits {

  global OrgLimits() {}

  /**
   * Returns a list of OrgLimit instances.
   * @return List<System.OrgLimit>
   */
  global static List<System.OrgLimit> getAll() {}

  /**
   * Returns a map of all OrgLimit instances with the limit name as key.
   * @return Map<String,System.OrgLimit>
   */
  global static Map<String,System.OrgLimit> getMap() {}

  global Object clone() {}

}