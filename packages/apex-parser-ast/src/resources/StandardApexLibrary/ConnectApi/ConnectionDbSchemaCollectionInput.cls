/**
 * Represents the input for a database schema collection.
 */
global class ConnectionDbSchemaCollectionInput {

  /**
   * The database name and other connector-specific properties that are required to fetch a list of database schemas.
   */
  global Map < String , String > advancedAttributes;

}