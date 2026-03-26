/**
 * The Cookie class lets you access cookies for your Salesforce site using Apex.
 */
global class Cookie {

  public Cookie(String name, String value, String path, Integer maxAge, Boolean isSecure) {}

  public Cookie(String name, String value, String path, Integer maxAge, Boolean isSecure, String SameSite) {}

  public Cookie(String name, String value, String path, Integer maxAge, Boolean isSecure, String SameSite, Boolean isHttpOnly) {}

  /**
   * Returns the name of the server making the request.
   * @return String
   */
  public String getDomain() {}

  /**
   * Returns a number representing how long the cookie is valid for, in seconds. If set to < 0 , a session cookie is issued. If set to 0 , the cookie is deleted.
   * @return Integer
   */
  public Integer getMaxAge() {}

  /**
   * Returns the name of the cookie. Can't be null .
   * @return String
   */
  public String getName() {}

  /**
   * Returns the path from which you can retrieve the cookie. If null or blank, the location is set to root, or “/”.
   * @return String
   */
  public String getPath() {}

  /**
   * Returns the value for the SameSite attribute of the cookie.
   * @return String
   */
  public String getSameSite() {}

  /**
   * Returns the data captured in the cookie, such as Session ID.
   * @return String
   */
  public String getValue() {}

  /**
   * Returns true if the cookie can only be accessed through HTTPS, otherwise returns false .
   * @return Boolean
   */
  public Boolean isSecure() {}

  /**
   * Returns true if client-side JavaScript is forbidden from accessing the cookie; otherwise returns false .
   * @return Boolean
   */
  public Boolean isHttpOnly() {}

}