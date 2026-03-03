/**
 * Get externally managed accounts.
 */
global class ExternalManagedAccount {

  public static ConnectApi.ExternalManagedAccountCollectionOutput getCommunitiesExternalManagedAccounts(String communityId) {}

  public static ConnectApi.ExternalManagedAccountCollectionOutput getCommunitiesExternalManagedAccounts(String communityId, Boolean includeMyAccount) {}

  public static ConnectApi.ExternalManagedAccountCollectionOutput getExternalManagedAccounts(String webstoreId) {}

  public static ConnectApi.ExternalManagedAccountCollectionOutput getExternalManagedAccounts(String webstoreId, Boolean includeMyAccount) {}

}