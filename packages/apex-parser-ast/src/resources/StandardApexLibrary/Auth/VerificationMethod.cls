/**
 * Contains the different ways users can identify themselves when logging in. You can use it to implement mobile-centric passwordless login pages and to self-register (and deregister) verification methods.
 * Usage
 * The enum value is an argument in System.Site.passwordlessLogin, System.UserManagement.registerVerificationMethod, and System.UserManagement.deregisterVerificationMethod methods. The value indicates the method used to verify a user’s identity.
 * Enum Values
 * The following are the values of the Auth.VerificationMethod enum.
 */
global enum VerificationMethod {
    BUILT_IN_AUTHENTICATOR,
    CUSTOM_OTP_DELIVERY,
    EMAIL,
    PASSWORD,
    SALESFORCE_AUTHENTICATOR,
    SECURITY_KEY,
    SMS,
    TOTP,
    U2F

}