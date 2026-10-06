/**
 * Determines which set of credentials is used to authenticate to the external system.
 * Usage
 * The relevant credentials are passed to your DataSource.Connection class.
 * Enum Values
 * The following are the values of the DataSource.IdentityType enum.
 */
global enum IdentityType {
    ANONYMOUS,
    NAMED_USER,
    PER_USER

}