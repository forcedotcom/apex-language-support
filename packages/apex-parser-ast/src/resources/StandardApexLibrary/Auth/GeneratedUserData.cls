/**
 * Stores the output of the Generate User Data invocable action, which you can access in Flow Builder.
 */
global class GeneratedUserData {

  global GeneratedUserData(String firstName, String lastName, String email, String username, String alias, String languageLocaleKey, String localesIdKey, String emailEncodingKey, String timeZoneSidKey) {}

  global String alias;

  global String email;

  global String emailEncodingKey;

  global String firstName;

  global String languageLocaleKey;

  global String lastName;

  global String localesIdKey;

  global String timeZoneSidKey;

  global String username;

  global Object clone() {}

}