/**
 * Defines the different modes, such as system or user mode, that Apex database operations execute in.
 */
global class AccessLevel {

  global AccessLevel() {}

  public Object SYSTEM_MODE;

  public Object USER_MODE;

  public System.AccessLevel withPermissionSetId(String permissionSetId) {}

  global Object clone() {}

}