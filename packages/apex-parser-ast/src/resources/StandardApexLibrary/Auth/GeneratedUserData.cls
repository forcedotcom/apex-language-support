/**
 * Stores the output of the Generate User Data invocable action, which you can access in Flow Builder.
 */
global class GeneratedUserData {

  public GeneratedUserData(String firstName, String lastName, String email, String username, String alias, String languageLocaleKey, String localesIdKey, String emailEncodingKey, String timeZoneSidKey) {}

  public String alias;

  public String email;

  public String emailEncodingKey;

  public String firstName;

  public String languageLocaleKey;

  public String lastName;

  public String localesIdKey;

  public String timeZoneSidKey;

  public String username;

  global Object clone() {}

}