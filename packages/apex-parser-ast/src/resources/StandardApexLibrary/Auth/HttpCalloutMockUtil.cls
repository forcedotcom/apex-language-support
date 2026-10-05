/**
 * Contains a method to send fake HTTP callouts for classes in the Auth namespace.
 * <p>Usage
 * Use the setHttpMock method in this class to test HTTP callouts when implementing the Auth.JWTBearerTokenExchange and Auth.JWTUtil classes.
 * For the Auth.JWTBearerTokenExchange class, mock callouts to the OAuth token endpoint when using the JWTBearerTokenExchange method.
 * For the Auth.JWTUtil class, mock callouts to the identity provider’s JSON Web Key Set (JWKS) endpoint when using the validateJWTWithKeysEndpoint method.
 * For more information on mocking HTTP callouts, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_classes_restful_http_testing_httpcalloutmock.htm" target="_blank">Testing HTTP Callouts by Implementing the HttpCalloutMock Interface</a>.
 */
@IsTest
global class HttpCalloutMockUtil {
    global HttpCalloutMockUtil() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Mocks an HTTP callout using an implementation of the System.HttpCalloutMock interface.
     */
    global static void setHttpMock(System.HttpCalloutMock mock) { }

    global override virtual String toString() { return null; }
}