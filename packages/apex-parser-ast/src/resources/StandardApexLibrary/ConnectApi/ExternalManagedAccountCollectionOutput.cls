/**
 * Collection of externally managed accounts.
 */
global class ExternalManagedAccountCollectionOutput {

  global ExternalManagedAccountCollectionOutput() {}

  /**
   * Collection of externally managed accounts.
   */
  global List < ConnectApi.ExternalManagedAccountOutput > externalManagedAccounts;

  /**
   * Total number of externally managed accounts.
   */
  global Integer totalExternalManagedAccounts;

  global Object clone() {}

}