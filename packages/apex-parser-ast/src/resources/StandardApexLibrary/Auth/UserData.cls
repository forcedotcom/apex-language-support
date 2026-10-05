/**
 * Stores user information for authentication provider registration handlers, including handlers that implement the Auth.RegistrationHandler interface and handlers built using Flow Builder.
 * <p>Usage
 * For more information about using this class with the Auth.RegistrationHandler interface, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexref.meta/apexref/apex_auth_plugin.htm#apex_auth_plugin_part2" target="_blank">Storing User Information and Getting Access Tokens</a> in the RegistrationHandler Interface documentation.
 * For more information about using this class as an Apex-defined variable in a user registration flow, see <a class="xref" href="https://help.salesforce.com/s/articleView?id=xcloud.sso_flow_registration_handler_example.htm&amp;language=en_US" target="_blank">Example: Authentication Provider Registration Handler Flow</a> in Salesforce Help
 */
global class UserData {
    /**
     * A map of data from the third party, in case the handler has to access non-standard values. For example, when using Janrain as a provider, the fields Janrain returns in its accessCredentials dictionary are placed into the attributeMap. These fields vary by provider.
     * <p>Map<String, String>
     */
    global Map attributeMap;
    /**
     * The email address of the authenticated user, according to the third party.
     * <p>String
     */
    @AuraEnabled
    global webservice String email;
    /**
     * The first name of the authenticated user, according to the third party.
     * <p>String
     */
    @AuraEnabled
    global webservice String firstName;
    /**
     * The full name of the authenticated user, according to the third party.
     * <p>String
     */
    @AuraEnabled
    global webservice String fullName;
    /**
     * If provided, the ID token from the third party, formatted as an encoded JWT. The ID token contains claims with information about the authenticated user.
     * <p>String
     */
    @AuraEnabled
    global String idToken;
    /**
     * If provided, the ID token from the third party. The ID token is formatted as a JSON Web Token (JWT) containing claims with information about the user. When used in this property, the ID token is serialized into a string.
     * <p>String
     */
    @AuraEnabled
    global String idTokenJSONString;
    /**
     * An identifier from the third party for the authenticated user, such as the Facebook user number or the Salesforce user ID.
     * <p>String
     */
    @AuraEnabled
    global webservice String identifier;
    /**
     * The last name of the authenticated user, according to the third party.
     * <p>String
     */
    @AuraEnabled
    global webservice String lastName;
    /**
     * A stable link for the authenticated user such as https://www.facebook.com/MyUsername.
     * <p>String
     */
    @AuraEnabled
    global webservice String link;
    /**
     * The standard locale string for the authenticated user.
     * <p>String
     */
    @AuraEnabled
    global webservice String locale;
    /**
     * The service used to log in, such as Facebook or Janrain.
     * <p>String
     */
    @AuraEnabled
    global webservice String provider;
    /**
     * The site login page URL passed in if used with a site; null otherwise.
     * <p>String
     */
    @AuraEnabled
    global webservice String siteLoginUrl;
    /**
     * If provided, the user info response from the third party. The user info response is a JSON object containing user attributes. When used in this property, the JSON object is serialized into a string.
     * <p>String
     */
    @AuraEnabled
    global String userInfoJSONString;
    /**
     * The username of the authenticated user in the third party.
     * <p>String
     */
    @AuraEnabled
    global webservice String username;

    /**
     * Creates a new instance of the Auth.UserData class using the specified arguments.
     */
    global UserData(String identifier, String firstName, String lastName, String fullName, String email, String link, String username, String locale, String provider, String siteLoginUrl, Map attributeMap) { }

    /**
     * Creates an instance of the Auth.UserData class that includes the ID token and user info response from the identity provider, if returned during single sign-on.
     */
    global UserData(String identifier, String firstName, String lastName, String fullName, String email, String link, String username, String locale, String provider, String siteLoginUrl, Map attributeMap, String idToken, String userInfoJSONString) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}