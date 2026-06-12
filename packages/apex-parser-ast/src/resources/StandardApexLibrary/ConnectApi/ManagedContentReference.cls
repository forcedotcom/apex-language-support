/**
 * Managed content reference.
 */
global class ManagedContentReference extends ConnectApi.AbstractManagedContentReference {

  global ManagedContentReference() {}

  /**
   * Map of properties of the managed content reference with their values.
   */
  global Map < String , Object> contentBody;

  /**
   * Title of the managed content reference.
   */
  global String title;

  global Object clone() {}

}