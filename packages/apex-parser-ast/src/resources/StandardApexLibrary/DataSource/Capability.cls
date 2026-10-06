/**
 * Declares which functional operations the external system supports. Also specifies required endpoint settings for the external data source definition.
 * Usage
 * The DataSource.Provider class returns DataSource.Capability enum values, which:
 * Specify the functional capabilities of the external system.
 * Determine which endpoint settings are available on the external data source definition in Salesforce.
 * Enum Values
 * The following are the values of the DataSource.Capability enum.
 */
global enum Capability {
    MATCH,
    MULTI_PICKLIST,
    PICKLIST,
    QUERY_PAGINATION_SERVER_DRIVEN,
    QUERY_TOTAL_SIZE,
    REQUIRE_ENDPOINT,
    REQUIRE_HTTPS,
    ROW_CREATE,
    ROW_DELETE,
    ROW_QUERY,
    ROW_UPDATE,
    SEARCH

}