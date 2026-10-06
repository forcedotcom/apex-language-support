/**
 * Generate authentication tokens to access preference forms.
 * Example
 * Call the generateToken() method to generate a single token for a specified Salesforce record ID:
 * Individual individual = [SELECT Id FROM Individual LIMIT 1];
 * String token = pref_center.TokenUtility.generateToken(individual.Id);
 * // Do something with the token
 * System.debug(token)
 * Call the generateTokens() method to generate tokens in bulk when given a list of Salesforce record IDs:
 * List<Id> individualIds = new List<Id>();
 * // Get Ids of Individuals who have not opted out of tracking
 * for (Individual individual : [SELECT Id FROM Individual WHERE HasOptedOutTracking = false]) {
 *     individualIds.add(individual.Id);
 * }
 * // Generate tokens for the list of Individual record Ids
 * Map<String, String> tokens = pref_center.TokenUtility.generateTokens(individualIds);
 * String firstIndividualId = individualIds[0];
 * // The returned Map has the input record Id as key and the corresponding token as value
 * String tokenForFirstIndividual = tokens.get(firstIndividualId);
 * // Do something with the token
 * System.debug(tokenForFirstIndividual);
 */
global class TokenUtility {
    global TokenUtility() { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the authentication token for the specified token value using the default standard token type.
     */
    global static String generateToken(String tokenValue) { return null; }

    /**
     * Returns the authentication token for the specified token value using the given token type.
     */
    global static String generateToken(String tokenValue, pref_center.TokenType tokenType) { return null; }

    /**
     * Returns the generated tokens in the form of a map. This method uses the default standard token type to generate the tokens.
     */
    global static Map generateTokens(List tokenValues) { return null; }

    /**
     * Returns the authentication tokens in the form of a map, where the map key is the input value to be tokenized and the map value is the corresponding token. The given token type is used to generate the tokens.
     */
    global static Map generateTokens(List tokenValues, pref_center.TokenType tokenType) { return null; }

    global static Map generateTokens(List tokenValues, pref_center.TokenType tokenType, pref_center.DataCloudIdTokenType dataCloudIdTokenType) { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}