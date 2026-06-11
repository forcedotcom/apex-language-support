/**
 * Credential custom header.
 */
global class CredentialCustomHeader {

  global CredentialCustomHeader() {}

  /**
   * Header name.
   */
  global String headerName;

  /**
   * Header value that can contain formulas.
   */
  global String headerValue;

  /**
   * ID of the customer header parameter.
   */
  global String id;

  /**
   * Sequence number of the header. The sequence number determines the order of the header.
   */
  global Integer sequenceNumber;

  global Object clone() {}

}