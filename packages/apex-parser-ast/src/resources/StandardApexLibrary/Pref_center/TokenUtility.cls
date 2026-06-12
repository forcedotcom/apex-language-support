/**
 * Generate authentication tokens to access preference forms.
 */
global class TokenUtility {

  global TokenUtility() {}

  global static String generateToken(String tokenValue, pref_center.TokenType tokenType) {}

  global static String generateToken(String tokenValue) {}

  global static Map<String,String> generateTokens(List<String> tokenValues, pref_center.TokenType tokenType) {}

  global static Map<String,String> generateTokens(List<String> tokenValues) {}

  global Object clone() {}

  global static Map<String,String> generateTokens(List<String> tokenValues, pref_center.TokenType tokenType, pref_center.DataCloudIdTokenType dataCloudIdTokenType) {}

}