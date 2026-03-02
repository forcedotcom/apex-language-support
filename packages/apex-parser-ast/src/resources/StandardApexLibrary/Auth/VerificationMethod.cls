/**
 * Contains the different ways users can identify themselves when logging in. You can use it to implement mobile-centric passwordless login pages and to self-register (and deregister) verification methods.
 */
public enum VerificationMethod {
  BUILT_IN_AUTHENTICATOR,
  EMAIL,
  PASSWORD,
  SALESFORCE_AUTHENTICATOR,
  SECURITY_KEY,
  SMS,
  TOTP,
  U2F
}