/**
 * Determines what type of credentials are used to authenticate to the external system.
 * Enum Values
 * The following are the values of the DataSource.AuthenticationProtocol enum.
 */
global enum AuthenticationProtocol {
    CERTIFICATE,
    NONE,
    OAUTH,
    PASSWORD

}