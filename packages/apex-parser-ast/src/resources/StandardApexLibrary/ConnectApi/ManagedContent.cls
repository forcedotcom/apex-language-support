/**
 * Clone managed content. Create and get managed content. Create, delete, or update a digital asset management (DAM) provider instance. Delete and replace variants. Get channels. Get a managed content space. Get DAM providers. Get targets that managed content space folders can be shared with. Get and update targets that managed content space folders are shared with. Publish and unpublish content.
 */
global class ManagedContent {

  public static ConnectApi.ManagedContentDocumentClone cloneManagedContentDocument(String contentKeyOrId, ConnectApi.ManagedContentDocumentCloneInput ManagedContentCloneInputParam) {}

  public static ConnectApi.ManagedContentDocument createManagedContent(ConnectApi.ManagedContentDocumentInput ManagedContentInputParam) {}

  public static ConnectApi.ManagedContentProviderInstance createManagedContentProvider(ConnectApi.ManagedContentProviderInstanceInput providerInstanceInput) {}

  public static ConnectApi.ManagedContentDocument createManagedContentWithMedia(ConnectApi.ManagedContentDocumentInput ManagedContentInputParam, ConnectApi.BinaryInput contentData) {}

  public static void deleteManagedContentProviderInstance(String providerInstanceId) {}

  public static void deleteManagedContentVariant(String variantId) {}

  public static ConnectApi.ManagedContentVersionCollection getAllContent(String channelId, Integer pageParam, Integer pageSize, String language, String managedContentType, Boolean includeMetadata, String startDate, String endDate) {}

  public static ConnectApi.ManagedContentVersionCollection getAllContent(String channelId, Integer pageParam, Integer pageSize, String language, String managedContentType, Boolean includeMetadata, String startDate, String endDate, Boolean showAbsoluteUrl) {}

  public static ConnectApi.ManagedContentChannelCollection getAllDeliveryChannels(Integer pageParam, Integer pageSize) {}

  public static ConnectApi.ManagedContentVersionCollection getAllManagedContent(String communityId, Integer pageParam, Integer pageSize, String language, String managedContentType) {}

  public static ConnectApi.ManagedContentVersionCollection getAllManagedContent(String communityId, Integer pageParam, Integer pageSize, String language, String managedContentType, Boolean showAbsoluteUrl) {}

  public static ConnectApi.ManagedContentVersionCollection getContentByContentKeys(String channelId, List<String> contentKeys, Integer pageParam, Integer pageSize, String language, String managedContentType, Boolean includeMetadata, String startDate, String endDate, Boolean showAbsoluteUrl) {}

  public static ConnectApi.ManagedContentVersionCollection getContentByIds(String channelId, List<String> managedContentIds, Integer pageParam, Integer pageSize, String language, String managedContentType, Boolean includeMetadata, String startDate, String endDate) {}

  public static ConnectApi.ManagedContentVersionCollection getContentByIds(String channelId, List<String> managedContentIds, Integer pageParam, Integer pageSize, String language, String managedContentType, Boolean includeMetadata, String startDate, String endDate, Boolean showAbsoluteUrl) {}

  public static ConnectApi.ManagedContentVersionCollection getManagedContentByContentKeys(String communityId, List<String> contentKeys, Integer pageParam, Integer pageSize, String language, String managedContentType, Boolean showAbsoluteUrl) {}

  public static ConnectApi.ManagedContentVersionCollection getManagedContentByIds(String communityId, List<String> managedContentIds, Integer pageParam, Integer pageSize, String language, String managedContentType) {}

  public static ConnectApi.ManagedContentVersionCollection getManagedContentByIds(String communityId, List<String> managedContentIds, Integer pageParam, Integer pageSize, String language, String managedContentType, Boolean showAbsoluteUrl) {}

  public static ConnectApi.ManagedContentVersionCollection getManagedContentByTopics(String communityId, List<String> topics, Integer pageParam, Integer pageSize, String language, String managedContentType) {}

  public static ConnectApi.ManagedContentVersionCollection getManagedContentByTopics(String communityId, List<String> topics, Integer pageParam, Integer pageSize, String language, String managedContentType, Boolean showAbsoluteUrl) {}

  public static ConnectApi.ManagedContentVersionCollection getManagedContentByTopicsAndContentKeys(String communityId, List<String> contentKeys, List<String> topics, Integer pageParam, Integer pageSize, String language, String managedContentType, Boolean showAbsoluteUrl) {}

  public static ConnectApi.ManagedContentVersionCollection getManagedContentByTopicsAndIds(String communityId, List<String> managedContentIds, List<String> topics, Integer pageParam, Integer pageSize, String language, String managedContentType) {}

  public static ConnectApi.ManagedContentVersionCollection getManagedContentByTopicsAndIds(String communityId, List<String> managedContentIds, List<String> topics, Integer pageParam, Integer pageSize, String language, String managedContentType, Boolean showAbsoluteUrl) {}

  public static ConnectApi.ManagedContentProviderCollection getManagedContentProviders() {}

  public static ConnectApi.ManagedContentProviderCollection getManagedContentProvidersForSpace(String contentSpaceId) {}

  public static ConnectApi.MCSFolderShareCollection getMCSFolderShares(String folderId) {}

  public static ConnectApi.MCSFolderShareTargetCollection getMCSFolderShareTargets(String folderId) {}

  public static ConnectApi.MCSFolderShareCollection patchMCSFolderShares(String folderId, ConnectApi.MCSFolderShareCollectionUpdateInput mcsFolderShareCollectionUpdateInput) {}

  public static ConnectApi.ManagedContentPublishOutput publish(ConnectApi.ManagedContentPublishInput publishInput) {}

  public static ConnectApi.ManagedContentVariant replaceManagedContentVariant(String variantId, ConnectApi.ManagedContentVariantUpdateInput ManagedContentVariantInputParam) {}

  public static ConnectApi.ManagedContentVariant replaceManagedContentVariantWithMedia(String variantId, ConnectApi.ManagedContentVariantUpdateInput ManagedContentVariantInputParam, ConnectApi.BinaryInput contentData) {}

  public static ConnectApi.ManagedContentUnpublishOutput unpublish(ConnectApi.ManagedContentUnpublishInput unpublishInput) {}

  public static ConnectApi.ManagedContentProviderInstance updateManagedContentProviderInstance(String providerInstanceId, ConnectApi.ManagedContentProviderInput providerInstanceInput) {}

  public static ConnectApi.ManagedContentChannelCollection getAllDeliveryChannels(Integer pageParam, Integer pageSize) {}

  public static ConnectApi.ManagedContentSpace getManagedContentSpace(String contentSpaceId) {}

}