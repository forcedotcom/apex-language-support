/**
 * Use the HttpRequest class to programmatically create HTTP requests like GET, POST, PATCH, PUT, and DELETE.
 */
public class HttpRequest {

  /**
   * Retrieves the body of this request.
   * @return String
   */
  public String getBody() {}

  /**
   * Retrieves the body of this request as a Blob.
   * @return Blob
   */
  public Blob getBodyAsBlob() {}

  /**
   * Retrieves the body of this request as a DOM document.
   * @return Dom.Document
   */
  public Dom.Document getBodyDocument() {}

  /**
   * If true , the request body is compressed, false otherwise.
   * @return Boolean
   */
  public Boolean getCompressed() {}

  /**
   * Retrieves the URL for the endpoint of the external server for this request.
   * @return String
   */
  public String getEndpoint() {}

  /**
   * Retrieves the contents of the request header.
   * @param key 
   * @return String
   */
  public String getHeader(String key) {}

  /**
   * Returns the type of method used by HttpRequest .
   * @return String
   */
  public String getMethod() {}

  /**
   * Sets the contents of the body for this request.
   * @param body 
   * @return Void
   */
  public Void setBody(String body) {}

  /**
   * Sets the contents of the body for this request using a Blob.
   * @param body 
   * @return Void
   */
  public Void setBodyAsBlob(Blob body) {}

  /**
   * Sets the contents of the body for this request. The contents represent a DOM document.
   * @param document 
   * @return Void
   */
  public Void setBodyDocument(Dom.Document document) {}

  /**
   * This method is deprecated. Use setClientCertificateName instead.
   * @param clientCert 
   * @param password 
   * @return Void
   */
  public Void setClientCertificate(String clientCert, String password) {}

  /**
   * If the external service requires a client certificate for authentication, set the certificate name.
   * @param certDevName 
   * @return Void
   */
  public Void setClientCertificateName(String certDevName) {}

  /**
   * If true , the data in the body is delivered to the endpoint in the gzip compressed format. If false , no compression format is used.
   * @param flag 
   * @return Void
   */
  public Void setCompressed(Boolean flag) {}

  /**
   * Specifies the endpoint for this request.
   * @param endpoint Possible values for the endpoint: Endpoint URL https: //my_endpoint.example.com/some_path Named credential URL, which contains the scheme callout , the name of the named credential, and, optionally, an appended path callout :My_Named_Credential/some_path
   * @return Void
   */
  public Void setEndpoint(String endpoint) {}

  /**
   * Sets the contents of the request header.
   * @param key 
   * @param value 
   * @return Void
   */
  public Void setHeader(String key, String value) {}

  /**
   * Sets the type of method to be used for the HTTP request.
   * @param method Possible values for the method type include: DELETE GET HEAD PATCH POST PUT TRACE
   * @return Void
   */
  public Void setMethod(String method) {}

  /**
   * Sets a timeout for the request between 1 and 120,000 milliseconds. The timeout is the maximum time to wait for establishing the HTTP connection. The same timeout is used for waiting for the request to start. When the request is executing, such as retrieving or posting data, the connection is kept alive until the request finishes.
   * @param timeout 
   * @return Void
   */
  public Void setTimeout(Integer timeout) {}

  /**
   * Returns a string containing the URL for the endpoint of the external server for this request and the method used, for example, Endpoint=http://YourServer, Method=POST
   * @return String
   */
  public String toString() {}

}