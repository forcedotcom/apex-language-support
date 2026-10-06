/**
 * Contains the credentials for authenticating to the external system.
 * Usage
 * If your extension of the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_class_DataSource_Provider.htm" target="_blank">DataSource.Provider</a> class returns <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_enum_DataSource_AuthenticationCapability.htm" target="_blank">DataSource.AuthenticationCapability</a> values that indicate support for authentication, the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_class_DataSource_Connection.htm" target="_blank">DataSource.Connection</a> class is instantiated with a <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_class_DataSource_ConnectionParams.htm" target="_blank">DataSource.ConnectionParams</a> instance in the constructor.
 * The authentication credentials in the DataSource.ConnectionParams instance depend on the Identity Type field of the external data source definition in Salesforce.
 * If Identity Type is set to Named Principal, the credentials come from the external data source definition.
 * If Identity Type is set to Per User:
 * For queries and searches, the credentials are specific to the current user who invokes the query or search. The credentials come from the user’s authentication settings for the external system.
 * For administrative connections, such as syncing the external system’s schema, the credentials come from the external data source definition.
 * The values in this class can appear in debug logs and can be accessed by users who have the “Author Apex” permission. If you require better security, we recommend that you specify named credentials instead of URLs as your Apex callout endpoints. Salesforce manages all authentication for Apex callouts that specify a named credential as the callout endpoint so that your code doesn’t have to.
 */
global class ConnectionParams {
    /**
     * The name of the certificate for establishing each connection to the external system.
     * String
     * The value comes from the external data source definition in Salesforce.
     */
    global String certificateName { get; set; }
    /**
     * The URL of the external system.
     * String
     * The value comes from the external data source definition in Salesforce.
     */
    global String endpoint { get; set; }
    /**
     * The OAuth token that’s issued by the external system.
     * String
     */
    global String oauthToken { get; set; }
    /**
     * The password for authenticating to the external system.
     * String
     * The value depends on the Identity Type field of the external data source definition in Salesforce.
     * If Identity Type is set to Named Principal, the credentials come from the external data source definition.
     * If Identity Type is set to Per User:
     * For queries and searches, the credentials are specific to the current user who invokes the query or search. The credentials come from the user’s authentication settings for the external system.
     * For administrative connections, such as syncing the external system’s schema, the credentials come from the external data source definition.
     */
    global String password { get; set; }
    /**
     * An instance of DataSource.IdentityType, which determines which set of credentials to use to access the external system.
     * DataSource.IdentityType
     */
    global DataSource.IdentityType principalType { get; set; }
    /**
     * The type of protocol that’s used to authenticate to the external system.
     * DataSource.AuthenticationProtocol
     */
    global DataSource.AuthenticationProtocol protocol { get; set; }
    /**
     * Reserved for future use.
     * String
     * Reserved for future use.
     */
    global String repository { get; set; }
    /**
     * The username for authenticating to the external system.
     * String
     * The value depends on the Identity Type field of the external data source definition in Salesforce.
     * If Identity Type is set to Named Principal, the credentials come from the external data source definition.
     * If Identity Type is set to Per User:
     * For queries and searches, the credentials are specific to the current user who invokes the query or search. The credentials come from the user’s authentication settings for the external system.
     * For administrative connections, such as syncing the external system’s schema, the credentials come from the external data source definition.
     */
    global String username { get; set; }

    global ConnectionParams() { }

    global Boolean equals(Object obj) { return false; }

    global Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}