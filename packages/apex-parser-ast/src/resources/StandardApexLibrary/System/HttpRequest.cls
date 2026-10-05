/**
 * Use the HttpRequest class to programmatically create HTTP requests like GET, POST, PATCH, PUT, and DELETE.
 * <p>Usage
 * Use the XML classes or JSON classes to parse XML or JSON content in the body of a request created by HttpRequest.
 * <p>Example
 * The following example illustrates how you can use an authorization header with a request and handle the response.
 * public with sharing class AuthCallout {
 *
 *    public void basicAuthCallout(){
 *      HttpRequest req = new HttpRequest();
 *      req.setEndpoint('http://www.yahoo.com');
 *      req.setMethod('GET');
 *
 *      // Specify the required user name and password to access the endpoint
 *      // As well as the header and header information
 *
 *      String username = 'myname';
 *      String password = 'mypwd';
 *
 *      Blob headerValue = Blob.valueOf(username + ':' + password);
 *      String authorizationHeader = 'Basic ' +
 *      EncodingUtil.base64Encode(headerValue);
 *      req.setHeader('Authorization', authorizationHeader);
 *
 *      // Create a new http object to send the request object
 *      // A response object is generated as a result of the request
 *
 *      Http http = new Http();
 *      HTTPResponse res = http.send(req);
 *      System.debug(res.getBody());
 *    }
 * }
 * Note
 * You can set the endpoint as a named credential URL. A named credential URL contains the scheme callout:, the name of the named credential, and an optional path. For example: callout:My_Named_Credential/some_path. A named credential specifies the URL of a callout endpoint and its required authentication parameters in one definition. Salesforce manages all authentication for Apex callouts that specify a named credential as the callout endpoint so that your code doesn’t have to. See <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_callouts_named_credentials.htm" target="_blank">Named Credentials as Callout Endpoints</a>.
 * <p>Compression
 * To compress the data you send, use setCompressed.
 * HttpRequest req = new HttpRequest();
 * req.setEndPoint('my_endpoint');
 * req.setCompressed(true);
 * req.setBody('some post body');
 *
 *
 * If a response comes back in compressed format, getBody recognizes the format, uncompresses it, and returns the uncompressed value.
 */
global class HttpRequest {
    /**
     * Creates a new instance of the HttpRequest class.
     */
    global HttpRequest() { }

    global Boolean equals(Object obj) { return false; }

    /**
     * Retrieves the body of this request.
     */
    global String getBody() { return null; }

    /**
     * Retrieves the body of this request as a Blob.
     */
    global Blob getBodyAsBlob() { return null; }

    /**
     * Retrieves the body of this request as a DOM document.
     * <p>Example
     * Use this method as a shortcut for:
     * String xml = httpRequest.getBody();
     * Dom.Document domDoc = new Dom.Document(xml);
     */
    global dom.Document getBodyDocument() { return null; }

    /**
     * If true, the request body is compressed, false otherwise.
     */
    global Boolean getCompressed() { return false; }

    /**
     * Retrieves the URL for the endpoint of the external server for this request.
     */
    global String getEndpoint() { return null; }

    /**
     * Retrieves the contents of the request header.
     */
    global String getHeader(String key) { return null; }

    /**
     * Returns the type of method used by HttpRequest.
     * <p>Usage
     * Examples of return values:
     * DELETE
     * GET
     * HEAD
     * PATCH
     * POST
     * PUT
     * TRACE
     */
    global String getMethod() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Sets the contents of the body for this request.
     * <p>Usage
     * Limit: 6 MB for synchronous Apex or 12 MB for asynchronous Apex.
     * The HTTP request and response sizes count towards the total heap size.
     */
    global void setBody(String body) { }

    /**
     * Sets the contents of the body for this request using a Blob.
     * <p>Usage
     * Limit: 6 MB for synchronous Apex or 12 MB for asynchronous Apex.
     * The HTTP request and response sizes count towards the total heap size.
     */
    global void setBodyAsBlob(Blob body) { }

    global void setBodyDocument(Object body) { }

    /**
     * This method is deprecated. Use setClientCertificateName instead.
     * <p>Usage
     * If the server requires a client certificate for authentication, set the client certificate PKCS12 key store and password.
     */
    global void setClientCertificate(String clientCert, String password) { }

    /**
     * If the external service requires a client certificate for authentication, set the certificate name.
     * <p>Usage
     * See <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_callouts_client_certs_http.htm" target="_blank">Using Certificates with HTTP Requests</a>.
     */
    global void setClientCertificateName(String certDevName) { }

    /**
     * If true, the data in the body is delivered to the endpoint in the gzip compressed format. If false, no compression format is used.
     */
    global void setCompressed(Boolean compressed) { }

    /**
     * Specifies the endpoint for this request.
     */
    global void setEndpoint(String endpoint) { }

    /**
     * Sets the contents of the request header.
     * <p>Usage
     * Limit 100 KB.
     */
    global void setHeader(String key, String value) { }

    /**
     * Sets the type of method to be used for the HTTP request.
     * <p>Usage
     * You can also use this method to set any required options.
     */
    global void setMethod(String method) { }

    /**
     * Sets a timeout for the request between 1 and 120,000 milliseconds. The timeout is the maximum time to wait for establishing the HTTP connection. The same timeout is used for waiting for the request to start. When the request is executing, such as retrieving or posting data, the connection is kept alive until the request finishes.
     */
    global void setTimeout(Integer timeout) { }

    /**
     * Returns a string containing the URL for the endpoint of the external server for this request and the method used, for example, Endpoint=http://YourServer, Method=POST
     */
    global String toString() { return null; }
}