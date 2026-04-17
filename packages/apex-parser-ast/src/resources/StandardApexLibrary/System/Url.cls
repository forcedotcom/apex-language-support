/**
 * Represents a uniform resource locator (URL) and provides access to parts of the URL. Enables access to the base URL used to access your Salesforce org.
 */
global class URL {

  /**
   * Returns the authority portion of the current URL.
   * @return String
   */
  public String getAuthority() {}

  /**
   * Returns the URL of an entire request on a Salesforce instance.
   * @return System.URL
   */
  public static System.URL getCurrentRequestUrl() {}

  /**
   * Returns the default port number of the protocol associated with the current URL.
   * @return Integer
   */
  public Integer getDefaultPort() {}

  /**
   * Returns the file name of the current URL.
   * @return String
   */
  public String getFile() {}

  /**
   * Returns the download URL for a file attachment.
   * @param entityId Specifies the ID of the entity that holds the file data.
   * @param fieldName Specifies the API name of a file field component, such as AttachmentBody .
   * @return String
   */
  public static String getFileFieldURL(String entityId, String fieldName) {}

  /**
   * Returns the host name of the current URL.
   * @return String
   */
  public String getHost() {}

  /**
   * Returns the canonical URL for your org. For example, https:// MyDomainName .my.salesforce.com .
   * @return System.URL
   */
  public static System.URL getOrgDomainUrl() {}

  /**
   * Returns the path portion of the current URL.
   * @return String
   */
  public String getPath() {}

  /**
   * Returns the port of the current URL.
   * @return Integer
   */
  public Integer getPort() {}

  /**
   * Returns the protocol name of the current URL, such as, https .
   * @return String
   */
  public String getProtocol() {}

  /**
   * Returns the query portion of the current URL.
   * @return String
   */
  public String getQuery() {}

  /**
   * Returns the anchor of the current URL.
   * @return String
   */
  public String getRef() {}

  /**
   * In API version 59.0 and later, this method is deprecated and versioned out. Use getOrgDomainUrl() to get the canonical URL for your org or use getCurrentRequestUrl() to get the URL of an entire request on a Salesforce instance. Returns the URL of the current connection to the Salesforce org.
   * @return System.URL
   */
  public static System.URL getSalesforceBaseUrl() {}

  /**
   * Gets the UserInfo portion of the current URL.
   * @return String
   */
  public String getUserInfo() {}

  /**
   * Compares the current URL with the specified URL object, excluding the fragment component.
   * @param URLToCompare 
   * @return Boolean
   */
  public Boolean sameFile(System.URL URLToCompare) {}

  /**
   * Returns a string representation of the current URL.
   * @return String
   */
  public String toExternalForm() {}

}