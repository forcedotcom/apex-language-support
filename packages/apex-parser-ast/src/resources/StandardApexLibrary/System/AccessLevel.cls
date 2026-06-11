/**
 * Defines the different modes, such as system or user mode, that Apex database operations execute in.
 */
global class AccessLevel {

  global AccessLevel() {}

  global Object SYSTEM_MODE;

  global Object USER_MODE;

  global System.AccessLevel withPermissionSetId(String permissionSetId) {}

  global Object clone() {}

}