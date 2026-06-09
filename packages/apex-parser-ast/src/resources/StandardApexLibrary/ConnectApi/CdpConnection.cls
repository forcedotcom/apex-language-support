/**
 * Get database schemas for a Data 360 connection.
 */
global class CdpConnection {

  global CdpConnection() {}

  global static ConnectApi.ConnectionDbSchemaCollection getDatabaseSchemas(String connectionId, ConnectApi.ConnectionDbSchemaCollectionInputRepresentation getDatabaseSchemasInput) {}

  global Object clone() {}

}