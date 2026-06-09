/**
 * Get externally managed accounts.
 */
global class ExternalManagedAccount {

  global ExternalManagedAccount() {}

  global static ConnectApi.ExternalManagedAccountCollectionOutput getCommunitiesExternalManagedAccounts(String communityId) {}

  global static ConnectApi.ExternalManagedAccountCollectionOutput getCommunitiesExternalManagedAccounts(String communityId, Boolean includeMyAccount) {}

  global static ConnectApi.ExternalManagedAccountCollectionOutput getExternalManagedAccounts(String webstoreId) {}

  global static ConnectApi.ExternalManagedAccountCollectionOutput getExternalManagedAccounts(String webstoreId, Boolean includeMyAccount) {}

  global Object clone() {}

}