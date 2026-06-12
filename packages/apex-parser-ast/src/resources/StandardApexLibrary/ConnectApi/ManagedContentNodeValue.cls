/**
 * Managed content node.
 */
global class ManagedContentNodeValue {

  global ManagedContentNodeValue() {}

  /**
   * Type of managed content node. Values are: Date DateTime Media MediaSource MultilineText NameField RichText Text Url
   */
  global ConnectApi.ManagedContentNodeType nodeType;

  global Object clone() {}

}