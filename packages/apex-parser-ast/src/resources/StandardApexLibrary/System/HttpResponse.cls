/**
 * Use the HttpResponse class to handle the HTTP response returned by the Http class.
 */
public class HttpResponse {

  /**
   * Retrieves the body returned in the response.
   * @return String
   */
  public String getBody() {}

  /**
   * Retrieves the body returned in the response as a Blob.
   * @return Blob
   */
  public Blob getBodyAsBlob() {}

  /**
   * Retrieves the body returned in the response as a DOM document.
   * @return Dom.Document
   */
  public Dom.Document getBodyDocument() {}

  /**
   * Retrieves the contents of the response header.
   * @param key 
   * @return String
   */
  public String getHeader(String key) {}

  /**
   * Retrieves an array of header keys returned in the response.
   * @return String []
   */
  public String [] getHeaderKeys() {}

  /**
   * Retrieves the status message returned for the response.
   * @return String
   */
  public String getStatus() {}

  /**
   * Retrieves the value of the status code returned in the response.
   * @return Integer
   */
  public Integer getStatusCode() {}

  /**
   * Returns an XmlStreamReader that parses the body of the callout response.
   * @return XmlStreamReader
   */
  public XmlStreamReader getXmlStreamReader() {}

  /**
   * Specifies the body returned in the response.
   * @param body 
   * @return Void
   */
  public Void setBody(String body) {}

  /**
   * Specifies the body returned in the response using a Blob.
   * @param body 
   * @return Void
   */
  public Void setBodyAsBlob(Blob body) {}

  /**
   * Specifies the contents of the response header.
   * @param key 
   * @param value 
   * @return Void
   */
  public Void setHeader(String key, String value) {}

  /**
   * Specifies the status message returned in the response.
   * @param status 
   * @return Void
   */
  public Void setStatus(String status) {}

  /**
   * Specifies the value of the status code returned in the response.
   * @param statusCode 
   * @return Void
   */
  public Void setStatusCode(Integer statusCode) {}

  /**
   * Returns the status message and status code returned in the response, for example:
   * @return String
   */
  public String toString() {}

}