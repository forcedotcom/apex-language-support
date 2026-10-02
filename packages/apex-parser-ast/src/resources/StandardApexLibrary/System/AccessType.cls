/**
 * Specifies the access check type for the fields of an sObject.
 * <p>Usage
 * Use these enum values for the accessCheckType parameter of the stripInaccessible method.
 * <p>Enum Values
 * The following are the values of the System.AccessType enum.
 */
global enum AccessType {
    CREATABLE,
    READABLE,
    UPDATABLE,
    UPSERTABLE

}