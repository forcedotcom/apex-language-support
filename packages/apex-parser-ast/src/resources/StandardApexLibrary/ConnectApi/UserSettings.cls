/**
 * Settings specific to a user.
 */
global class UserSettings {

  /**
   * User can approve workflows from Chatter posts.
   */
  global Boolean approvalPosts;

  /**
   * User can access personal stream feeds.
   */
  global Boolean canAccessPersonalStreams;

  /**
   * User can follow users and records.
   */
  global Boolean canFollow;

  /**
   * User has Modify all Data permission.
   */
  global Boolean canModifyAllData;

  /**
   * User can own groups.
   */
  global Boolean canOwnGroups;

  /**
   * User has View all Data permission.
   */
  global Boolean canViewAllData;

  /**
   * User has View all Groups permission.
   */
  global Boolean canViewAllGroups;

  /**
   * User has View all Users permission.
   */
  global Boolean canViewAllUsers;

  /**
   * User can see the site switcher menu.
   */
  global Boolean canViewCommunitySwitcher;

  /**
   * User can see other user’s Chatter profile.
   */
  global Boolean canViewFullUserProfile;

  /**
   * User can see all files that are public.
   */
  global Boolean canViewPublicFiles;

  /**
   * Currency symbol to use for displaying currency values. Applicable only when the ConnectApi.Features.multiCurrency property is false .
   */
  global String currencySymbol;

  /**
   * User is a Chatter customer.
   */
  global Boolean externalUser;

  /**
   * Maximum number of files user can sync.
   */
  global Integer fileSyncLimit;

  /**
   * Maximum storage for synced files, in megabytes (MB).
   */
  global Integer fileSyncStorageLimit;

  /**
   * Maximum number of folders user can sync.
   */
  global Integer folderSyncLimit;

  /**
   * User is a member of the internal org.
   */
  global Boolean hasAccessToInternalOrg;

  /**
   * User has access to Chatter.
   */
  global Boolean hasChatter;

  /**
   * User has Sync Files permission.
   */
  global Boolean hasFileSync;

  /**
   * User has Field Service GPS tracking enabled.
   */
  global Boolean hasFieldServiceLocationTracking;

  /**
   * User has access to the Field Service mobile app.
   */
  global Boolean hasFieldServiceMobileAccess;

  /**
   * Administrator for the user’s org allows file sync clients to update automatically.
   */
  global Boolean hasFileSyncManagedClientAutoUpdate;

  /**
   * User has access to REST API.
   */
  global Boolean hasRestDataApiAccess;

  /**
   * The user's time zone as selected in the user’s personal settings in Salesforce. This value does not reflect a device's current location.
   */
  global ConnectApi.TimeZone timeZone;

  /**
   * The ISO code for the default currency. Applicable only when the ConnectApi.Features.multiCurrency property is true .
   */
  global String userDefaultCurrencyIsoCode;

  /**
   * 18-character ID of the user.
   */
  global String userId;

  /**
   * Locale of user.
   */
  global String userLocale;

}