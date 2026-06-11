/**
 * External network connection.
 */
global class NetworkConnection {

  global NetworkConnection() {}

  /**
   * Name of the network connection.
   */
  global String developerName;

  /**
   * ID of the network connection.
   */
  global String id;

  /**
   * Label of the network connection.
   */
  global String masterLabel;

  /**
   * Namespace prefix of the network connection.
   */
  global String namespacePrefix;

  global Object clone() {}

}