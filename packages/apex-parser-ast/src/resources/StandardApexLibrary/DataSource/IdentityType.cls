/**
 * Determines which set of credentials is used to authenticate to the external system.
 */
global enum IdentityType {
  ANONYMOUS,
  NAMED_USER,
  PER_USER
}