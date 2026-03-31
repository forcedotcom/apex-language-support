/**
 * Collection of managed content providers.
 */
global class ManagedContentProviderCollection {

  /**
   * ID of the managed content space, if provided. Otherwise, null .
   */
  global String contentSpaceId;

  /**
   * URL to the current page of managed content providers.
   */
  global String currentPageUrl;

  /**
   * URL to the next page of managed content providers.
   */
  global String nextPageUrl;

  /**
   * Managed content providers.
   */
  global List < ConnectApi.ManagedContentProvider > providers;

  /**
   * Total number of managed content providers.
   */
  global Integer total;

}