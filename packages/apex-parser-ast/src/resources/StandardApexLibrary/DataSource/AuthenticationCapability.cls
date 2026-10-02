/**
 * Specifies the types of authentication that can be used to access the external system.
 * <p>Usage
 * The DataSource.Provider class returns DataSource.AuthenticationCapability enum values. The returned values determine which authentication settings are available on the external data source definition in Salesforce.
 * If you set up callouts in your DataSource.Connection class, you can specify the callout endpoints as named credentials instead of URLs. If you do so for all callouts, return ANONYMOUS as the sole entry in the list of data source authentication capabilities. That way, the external data source definition doesn’t require authentication settings. Salesforce manages all authentication for Apex callouts that specify a named credential as the callout endpoint so that your code doesn’t have to.
 * <p>Enum Values
 * The following are the values of the DataSource.AuthenticationCapability enum.
 */
global enum AuthenticationCapability {
    ANONYMOUS,
    BASIC,
    CERTIFICATE,
    OAUTH

}