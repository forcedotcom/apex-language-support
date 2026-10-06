/**
 * Provides request HTTP headers, body, and query parameters to the AuthProviderPlugin.handleCallback method for user authentication. This class allows you to group the information passed in rather than passing headers, body, and query parameters individually.
 */
global class AuthProviderCallbackState {
    /**
     * The HTTP body of the authentication request.
     * String
     */
    global webservice String body;
    /**
     * The HTTP headers of the authentication request.
     * Map<String,String>
     */
    global Map headers;
    /**
     * The HTTP query parameters of the authentication request.
     * Map<String,String>
     */
    global Map queryParameters;

    /**
     * Creates an instance of the AuthProviderCallbackState class using the specified HTTP headers, body, and query parameters of the authentication request.
     */
    global AuthProviderCallbackState(Map headers, String body, Map queryParameters) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}