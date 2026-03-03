/**
 * Get collection items. Get a managed content channel. Get managed content.
 */
global class ManagedContentDelivery {

  public static ConnectApi.ManagedContentDeliveryChannelsRepresentation getChannels(Integer pageParam, Integer pageSize) {}

  public static ConnectApi.ManagedContentCollectionItems getCollectionItemsForChannel(String channelId, String collectionKeyOrId, String language) {}

  public static ConnectApi.ManagedContentCollectionItems getCollectionItemsForChannel(String channelId, String collectionKeyOrId, String language, Integer pageToken, Integer pageSize) {}

  public static ConnectApi.ManagedContentCollectionItems getCollectionItemsForSite(String siteId, String collectionKeyOrId, String language) {}

  public static ConnectApi.ManagedContentCollectionItems getCollectionItemsForSite(String siteId, String collectionKeyOrId, String language, Integer pageToken, Integer pageSize) {}

  public static ConnectApi.ManagedContentDeliveryChannelRepresentation getManagedContentDeliveryChannel(String channelId) {}

  public static ConnectApi.ManagedContentDeliveryDocument getManagedContentForChannel(String channelId, String contentKeyOrId, Boolean showAbsoluteUrl) {}

  public static ConnectApi.ManagedContentDeliveryDocument getManagedContentForChannel(String channelId, String contentKeyOrId, String language, Boolean showAbsoluteUrl) {}

  public static ConnectApi.ManagedContentDeliveryDocument getManagedContentForChannel(String channelId, String contentKeyOrId, String language, Boolean showAbsoluteUrl, Integer referenceDepth, Boolean expandReferences, Boolean referencesAsList) {}

  public static ConnectApi.ManagedContentDeliveryDocument getManagedContentForSite(String siteId, String contentKeyOrId, Boolean showAbsoluteUrl) {}

  public static ConnectApi.ManagedContentDeliveryDocument getManagedContentForSite(String siteId, String contentKeyOrId, String language, Boolean showAbsoluteUrl) {}

  public static ConnectApi.ManagedContentDeliveryDocument getManagedContentForSite(String siteId, String contentKeyOrId, String language, Boolean showAbsoluteUrl, Integer referenceDepth, Boolean expandReferences, Boolean referencesAsList) {}

  public static ConnectApi.ManagedContentDeliveryDocumentCollection getManagedContentsForChannel(String channelId, List< String > managedContentIds, List< String > contentKeys, String contentTypeFQN, String language, String publishStartDate, String publishEndDate, Boolean includeContentBody, Integer referenceDepth, Boolean expandReferences, Boolean referencesAsList, Integer pageParam, Integer pageSize, Boolean showAbsoluteUrl) {}

  public static ConnectApi.ManagedContentDeliveryDocumentCollection getManagedContentsForSite(String siteId, List< String > managedContentIds, List< String > contentKeys, String contentTypeFQN, String language, String publishStartDate, String publishEndDate, Boolean includeContentBody, Integer referenceDepth, Boolean expandReferences, Boolean referencesAsList, Integer pageParam, Integer pageSize, Boolean showAbsoluteUrl) {}

  public static ConnectApi.ManagedContentChannelDetail getManagedContentChannel(String channelId) {}

  public static ConnectApi.ManagedContentDeliveryDocumentCollection getManagedContentsForChannel(String channelId, List< String > managedContentIds, List< String > contentKeys, String contentTypeFQN, String language, String publishStartDate, String publishEndDate, Boolean includeContentBody, Integer referenceDepth, Boolean expandReferences, Boolean referencesAsList, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.ManagedContentDeliveryDocumentCollection getManagedContentsForSite(String siteId, List< String > managedContentIds, List< String > contentKeys, String contentTypeFQN, String language, String publishStartDate, String publishEndDate, Boolean includeContentBody, Integer referenceDepth, Boolean expandReferences, Boolean referencesAsList, Integer pageParam, Integer pageSize) {}

}