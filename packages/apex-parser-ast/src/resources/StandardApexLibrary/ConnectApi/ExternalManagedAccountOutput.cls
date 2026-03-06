/**
 * Externally managed account.
 */
global class ExternalManagedAccountOutput {

  /**
   * ID of the account managed by another account.
   */
  global String accountId;

  /**
   * Name of the external managed account record.
   */
  global String accountName;

  /**
   * Default shipping address of the external managed account.
   */
  global ConnectApi.ExternalManagedAccountAddressOutput address;

  /**
   * ID of the external managed account record.
   */
  global String externalManagedAccountId;

  /**
   * Specifies whether the account is the context user’s account ( true ) or not ( false ).
   */
  global Boolean isMyAccount;

}