/**
 * Extend this base class to create a custom adapter for Salesforce Connect. The class informs Salesforce of the functional and authentication capabilities that are supported by or required to connect to the external system. This class extends the DataSourceUtil class and inherits its methods.
 * <p>Usage
 * Create an Apex class that extends DataSource.Provider to specify the following.
 * The types of authentication that can be used to access the external system
 * The features that are supported for the connection to the external system
 * The Apex class that extends DataSource.Connection to sync the external system’s schema and to handle the queries and searches of the external data
 * The values that are returned by the DataSource.Provider class determine which settings are available in the external data source definition in Salesforce. To access the external data source definition from Setup, enter External Data Sources in the Quick Find box, then select External Data Sources.
 */
global abstract class Provider extends DataSource.DataSourceUtil {
    global Object Provider() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the types of authentication that can be used to access the external system.
     * <p>When you call this method, be sure the list of the external system’s authentication capabilities always contains the same values. The returned authentication types should never change based on runtime conditions, user context, dynamic queries, or any other conditions. Returning different authentication types for an external system can lead to errors that are difficult to troubleshoot.
     * For example, if your external system supports OAuth and Anonymous authentication, always return these types every time this method is called. Don’t query the database, make callouts, or use conditional logic that varies the results of this method.
     */
    global abstract List getAuthenticationCapabilities();

    /**
     * Returns the functional operations and endpoint settings that the external system supports.
     * <p>When you call this method, be sure the list of the external system’s capabilities always contains the same values. The returned capabilities should never change based on runtime conditions, user context, dynamic queries, or any other conditions. Returning different capabilities for an external system can lead to errors that are difficult to troubleshoot.
     * For example, if your external system supports the ROW_QUERY and SEARCH operations, always return these capabilities every time this method is called. Don’t query the database, make callouts, or use conditional logic that varies the results of this method.
     */
    global abstract List getCapabilities();

    /**
     * Returns a connection that points to an instance of the external data source.
     */
    global abstract DataSource.Connection getConnection(DataSource.ConnectionParams connectionsParams);

    global virtual Integer hashCode() { return 0; }

    global void logWarning(String msg) { }

    global void throwException(String msg) { }

    global override virtual String toString() { return null; }
}