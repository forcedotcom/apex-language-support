/**
 * Get collection items. Get a managed content channel. Get managed content.
 */
global class ManagedContentDelivery {

  global ManagedContentDelivery() {}

  global static ConnectApi.ManagedContentDeliveryChannelsRepresentation getChannels(Integer pageParam, Integer pageSize) {}

  global static ConnectApi.ManagedContentCollectionItems getCollectionItemsForChannel(String channelId, String collectionKeyOrId, String language) {}

  global static ConnectApi.ManagedContentCollectionItems getCollectionItemsForChannel(String channelId, String collectionKeyOrId, String language, Integer pageToken, Integer pageSize) {}

  global static ConnectApi.ManagedContentCollectionItems getCollectionItemsForSite(String siteId, String collectionKeyOrId, String language) {}

  global static ConnectApi.ManagedContentCollectionItems getCollectionItemsForSite(String siteId, String collectionKeyOrId, String language, Integer pageToken, Integer pageSize) {}

  global static ConnectApi.ManagedContentDeliveryChannelRepresentation getManagedContentDeliveryChannel(String channelId) {}

  global static ConnectApi.ManagedContentDeliveryDocument getManagedContentForChannel(String channelId, String contentKeyOrId, Boolean showAbsoluteUrl) {}

  global static ConnectApi.ManagedContentDeliveryDocument getManagedContentForChannel(String channelId, String contentKeyOrId, String language, Boolean showAbsoluteUrl) {}

  global static ConnectApi.ManagedContentDeliveryDocument getManagedContentForChannel(String channelId, String contentKeyOrId, String language, Boolean showAbsoluteUrl, Integer referenceDepth, Boolean expandReferences, Boolean referencesAsList) {}

  global static ConnectApi.ManagedContentDeliveryDocument getManagedContentForSite(String siteId, String contentKeyOrId, Boolean showAbsoluteUrl) {}

  global static ConnectApi.ManagedContentDeliveryDocument getManagedContentForSite(String siteId, String contentKeyOrId, String language, Boolean showAbsoluteUrl) {}

  global static ConnectApi.ManagedContentDeliveryDocument getManagedContentForSite(String siteId, String contentKeyOrId, String language, Boolean showAbsoluteUrl, Integer referenceDepth, Boolean expandReferences, Boolean referencesAsList) {}

  global static ConnectApi.ManagedContentDeliveryDocumentCollection getManagedContentsForChannel(String channelId, List<String> managedContentIds, List<String> contentKeys, String contentTypeFQN, String language, String publishStartDate, String publishEndDate, Boolean includeContentBody, Integer referenceDepth, Boolean expandReferences, Boolean referencesAsList, Integer pageParam, Integer pageSize, Boolean showAbsoluteUrl) {}

  global static ConnectApi.ManagedContentDeliveryDocumentCollection getManagedContentsForSite(String siteId, List<String> managedContentIds, List<String> contentKeys, String contentTypeFQN, String language, String publishStartDate, String publishEndDate, Boolean includeContentBody, Integer referenceDepth, Boolean expandReferences, Boolean referencesAsList, Integer pageParam, Integer pageSize, Boolean showAbsoluteUrl) {}

  global static ConnectApi.ManagedContentChannelDetail getManagedContentChannel(String channelId) {}

  global static ConnectApi.ManagedContentDeliveryDocumentCollection getManagedContentsForChannel(String channelId, List<String> managedContentIds, List<String> contentKeys, String contentTypeFQN, String language, String publishStartDate, String publishEndDate, Boolean includeContentBody, Integer referenceDepth, Boolean expandReferences, Boolean referencesAsList, Integer pageParam, Integer pageSize) {}

  global static ConnectApi.ManagedContentDeliveryDocumentCollection getManagedContentsForSite(String siteId, List<String> managedContentIds, List<String> contentKeys, String contentTypeFQN, String language, String publishStartDate, String publishEndDate, Boolean includeContentBody, Integer referenceDepth, Boolean expandReferences, Boolean referencesAsList, Integer pageParam, Integer pageSize) {}

  global Object clone() {}

}