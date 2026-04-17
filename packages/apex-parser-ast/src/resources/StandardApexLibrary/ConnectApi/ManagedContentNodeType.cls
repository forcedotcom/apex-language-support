/**
 * Managed content node type.
 */
global class ManagedContentNodeType {

  /**
   * Label of the managed content node type.
   */
  global String label;

  /**
   * Developer name of the managed content node type.
   */
  global String name;

  /**
   * Type of managed content node. Values are: Date DateTime Media MediaSource MultilineText NameField RichText Text Url
   */
  global ConnectApi.ManagedContentNodeTypeEnum nodeType;

}