/**
 * Contains methods that apply a digital signature to a JSON Web Token (JWT), using a JSON Web Signature (JWS) data structure. This class creates the signed JWT bearer token, which can be used to request an OAuth access token in the OAuth 2.0 JWT bearer token flow.
 */
global class JWS {

  /**
   * Makes a duplicate copy of the JWS object.
   * @return Object
   */
  public Object clone() {}

  /**
   * Returns the compact serialization representation of the JWS as a concatenated string, with the encoded JWS header, encoded JWS payload, and encoded JWS signature strings separated by period ('.') characters.
   * @return String
   */
  public String getCompactSerialization() {}

}