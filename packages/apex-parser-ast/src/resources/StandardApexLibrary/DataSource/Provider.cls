/**
 * Extend this base class to create a custom adapter for Salesforce Connect. The class informs Salesforce of the functional and authentication capabilities that are supported by or required to connect to the external system. This class extends the DataSourceUtil class and inherits its methods.
 */
global class Provider extends DataSource.Provider {

  global Provider() {}

  /**
   * Returns the types of authentication that can be used to access the external system.
   * @return List<DataSource.AuthenticationCapability>
   */
  global List<DataSource.AuthenticationCapability> getAuthenticationCapabilities() {}

  /**
   * Returns the functional operations and endpoint settings that the external system supports.
   * @return List<DataSource.Capability>
   */
  global List<DataSource.Capability> getCapabilities() {}

  /**
   * Returns a connection that points to an instance of the external data source.
   * @param connectionParams Credentials for authenticating to the external system.
   * @return DataSource.Connection
   */
  global DataSource.Connection getConnection(DataSource.ConnectionParams connectionParams) {}

  global Object clone() {}

  global void logWarning(String msg) {}

  global void throwException(String msg) {}

}