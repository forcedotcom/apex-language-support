/**
 * Stores user information for authentication provider registration handlers, including handlers that implement the Auth.RegistrationHandler interface and handlers built using Flow Builder.
 */
global class UserData {

  global UserData(String identifier, String firstName, String lastName, String fullName, String email, String link, String userName, String locale, String provider, String siteLoginUrl, Map<String,String> attributeMap) {}

  global UserData(String identifier, String firstName, String lastName, String fullName, String email, String link, String username, String locale, String provider, String siteLoginUrl, Map<String,String> attributeMap, String idToken, String userInfoJSONString) {}

  global String identifier;

  global String firstName;

  global String lastName;

  global String fullName;

  global String email;

  global String link;

  global String username;

  global String locale;

  global String provider;

  global String siteLoginUrl;

  global Map<String, String> attributeMap;

  global String idToken;

  global String userInfoJSONString;

  global String idTokenJSONString;

  global Object clone() {}

}