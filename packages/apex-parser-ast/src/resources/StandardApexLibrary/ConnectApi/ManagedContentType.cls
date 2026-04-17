/**
 * Managed content type.
 */
global class ManagedContentType {

  /**
   * Label of the managed content type.
   */
  global String label;

  /**
   * Developer name of the managed content type.
   */
  global String name;

  /**
   * Map of node types for the managed content type.
   */
  global Map < String , ConnectApi.ManagedContentNodeType > nodeTypes;

}