/**
 * Determines which set of credentials is used to authenticate to the external system.
 * <p>Usage
 * The relevant credentials are passed to your DataSource.Connection class.
 * <p>Enum Values
 * The following are the values of the DataSource.IdentityType enum.
 */
global enum IdentityType {
    ANONYMOUS,
    NAMED_USER,
    PER_USER

}