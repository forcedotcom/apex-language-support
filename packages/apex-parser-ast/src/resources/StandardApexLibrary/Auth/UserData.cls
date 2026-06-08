/**
 * Stores user information for authentication provider registration handlers, including handlers that implement the Auth.RegistrationHandler interface and handlers built using Flow Builder.
 */
global class UserData {

  public UserData(String identifier, String firstName, String lastName, String fullName, String email, String link, String userName, String locale, String provider, String siteLoginUrl, Map<String,String> attributeMap) {}

  public UserData(String identifier, String firstName, String lastName, String fullName, String email, String link, String username, String locale, String provider, String siteLoginUrl, Map<String,String> attributeMap, String idToken, String userInfoJSONString) {}

  public String identifier;

  public String firstName;

  public String lastName;

  public String fullName;

  public String email;

  public String link;

  public String username;

  public String locale;

  public String provider;

  public String siteLoginUrl;

  public Map<String, String> attributeMap;

  public String idToken;

  public String userInfoJSONString;

  public String idTokenJSONString;

  global Object clone() {}

}