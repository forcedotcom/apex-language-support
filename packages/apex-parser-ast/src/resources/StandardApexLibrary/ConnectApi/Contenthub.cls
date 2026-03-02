/**
 * Access Files Connect repositories and their files and folders.
 */
public class ContentHub {

  public static ConnectApi.RepositoryFolderItem addRepositoryItem(String repositoryId, String repositoryFolderId, ConnectApi.ContentHubItemInput file) {}

  public static ConnectApi.RepositoryFolderItem addRepositoryItem(String communityId, String repositoryId, String repositoryFolderId, ConnectApi.ContentHubItemInput file) {}

  public static ConnectApi.RepositoryFolderItem addRepositoryItem(String repositoryId, String repositoryFolderId, ConnectApi.ContentHubItemInput file, ConnectApi.BinaryInput fileData) {}

  public static ConnectApi.RepositoryFolderItem addRepositoryItem(String communityId, String repositoryId, String repositoryFolderId, ConnectApi.ContentHubItemInput file, ConnectApi.BinaryInput fileData) {}

  public static ConnectApi.ContentHubAllowedItemTypeCollection getAllowedItemTypes(String repositoryId, String repositoryFolderId) {}

  public static ConnectApi.ContentHubAllowedItemTypeCollection getAllowedItemTypes(String repositoryId, String repositoryFolderId, ConnectApi.ConnectContentHubItemType filter) {}

  public static ConnectApi.ContentHubAllowedItemTypeCollection getAllowedItemTypes(String communityId, String repositoryId, String repositoryFolderId) {}

  public static ConnectApi.ContentHubAllowedItemTypeCollection getAllowedItemTypes(String communityId, String repositoryId, String repositoryFolderId, ConnectApi.ConnectContentHubItemType filter) {}

  public static ConnectApi.FilePreview getFilePreview(String repositoryId, String repositoryFileId, ConnectApi.FilePreviewFormat formatType) {}

  public static ConnectApi.FilePreview getFilePreview(String repositoryId, String repositoryFileId, ConnectApi.FilePreviewFormat formatType, Integer startPageNumber, Integer endPageNumber) {}

  public static ConnectApi.FilePreview getFilePreview(String communityId, String repositoryId, String repositoryFileId, ConnectApi.FilePreviewFormat formatType) {}

  public static ConnectApi.FilePreview getFilePreview(String communityId, String repositoryId, String repositoryFileId, ConnectApi.FilePreviewFormat formatType, Integer startPageNumber, Integer endPageNumber) {}

  public static ConnectApi.ContentHubItemTypeDetail getItemType(String repositoryId, String repositoryItemTypeId) {}

  public static ConnectApi.ContentHubItemTypeDetail getItemType(String communityId, String repositoryId, String repositoryItemTypeId) {}

  public static ConnectApi.FilePreviewCollection getPreviews(String repositoryId, String repositoryFileId) {}

  public static ConnectApi.FilePreviewCollection getPreviews(String communityId, String repositoryId, String repositoryFileId) {}

  public static ConnectApi.ContentHubRepositoryCollection getRepositories() {}

  public static ConnectApi.ContentHubRepositoryCollection getRepositories(String communityId) {}

  public static ConnectApi.ContentHubRepositoryCollection getRepositories(Integer pageParam, Integer pageSize) {}

  public static ConnectApi.ContentHubRepositoryCollection getRepositories(String communityId, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.ContentHubRepository getRepository(String repositoryId) {}

  public static ConnectApi.ContentHubRepository getRepository(String communityId, String repositoryId) {}

  public static ConnectApi.RepositoryFileDetail getRepositoryFile(String repositoryId, String repositoryFileId) {}

  public static ConnectApi.RepositoryFileDetail getRepositoryFile(String repositoryId, String repositoryFileId, Boolean includeExternalFilePermissionsInfo) {}

  public static ConnectApi.RepositoryFileDetail getRepositoryFile(String communityId, String repositoryId, String repositoryFileId) {}

  public static ConnectApi.RepositoryFileDetail getRepositoryFile(String communityId, String repositoryId, String repositoryFileId, Boolean includeExternalFilePermissionsInfo) {}

  public static ConnectApi.RepositoryFolderDetail getRepositoryFolder(String repositoryId, String repositoryFolderId) {}

  public static ConnectApi.RepositoryFolderDetail getRepositoryFolder(String communityId, String repositoryId, String repositoryFolderId) {}

  public static ConnectApi.RepositoryFolderItemsCollection getRepositoryFolderItems(String repositoryId, String repositoryFolderId) {}

  public static ConnectApi.RepositoryFolderItemsCollection getRepositoryFolderItems(String communityId, String repositoryId, String repositoryFolderId) {}

  public static ConnectApi.RepositoryFolderItemsCollection getRepositoryFolderItems(String repositoryId, String repositoryFolderId, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.RepositoryFolderItemsCollection getRepositoryFolderItems(String communityId, String repositoryId, String repositoryFolderId, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.RepositoryFileDetail updateRepositoryFile(String repositoryId, String repositoryFileId, ConnectApi.ContentHubItemInput file) {}

  public static ConnectApi.RepositoryFileDetail updateRepositoryFile(String repositoryId, String repositoryFileId, ConnectApi.ContentHubItemInput file, ConnectApi.BinaryInput fileData) {}

  public static ConnectApi.RepositoryFileDetail updateRepositoryFile(String communityId, String repositoryId, String repositoryFileId, ConnectApi.ContentHubItemInput file) {}

  public static ConnectApi.RepositoryFileDetail updateRepositoryFile(String communityId, String repositoryId, String repositoryFileId, ConnectApi.ContentHubItemInput file, ConnectApi.BinaryInput fileData) {}

  public static Void setTestAddRepositoryItem(String repositoryId, String repositoryFolderId, ConnectApi.ContentHubItemInput file, ConnectApi.RepositoryFolderItem result) {}

  public static Void setTestAddRepositoryItem(String communityId, String repositoryId, String repositoryFolderId, ConnectApi.ContentHubItemInput file, ConnectApi.RepositoryFolderItem result) {}

  public static Void setTestAddRepositoryItem(String repositoryId, String repositoryFolderId, ConnectApi.ContentHubItemInput file, ConnectApi.BinaryInput fileData, ConnectApi.RepositoryFolderItem result) {}

  public static Void setTestAddRepositoryItem(String communityId, String repositoryId, String repositoryFolderId, ConnectApi.ContentHubItemInput file, ConnectApi.BinaryInput fileData, ConnectApi.RepositoryFolderItem result) {}

  public static Void setTestGetAllowedItemTypes(String repositoryId, String repositoryFolderId, ConnectApi.ContentHubAllowedItemTypeCollection result) {}

  public static Void setTestGetAllowedItemTypes(String repositoryId, String repositoryFolderId, ConnectApi.ContentHubItemType filter, ConnectApi.ContentHubAllowedItemTypeCollection result) {}

  public static Void setTestGetAllowedItemTypes(String communityId, String repositoryId, String repositoryFolderId, ConnectApi.ContentHubAllowedItemTypeCollection result) {}

  public static Void setTestGetAllowedItemTypes(String communityId, String repositoryId, String repositoryFolderId, ConnectApi.ContentHubItemType filter, ConnectApi.ContentHubAllowedItemTypeCollection result) {}

  public static Void setTestGetFilePreview(String repositoryId, String repositoryFileId, ConnectApi.FilePreviewFormat formatType, ConnectApi.FilePreview result) {}

  public static Void setTestGetFilePreview(String repositoryId, String repositoryFileId, ConnectApi.FilePreviewFormat formatType, Integer startPageNumber, Integer endPageNumber, ConnectApi.FilePreview result) {}

  public static Void setTestGetFilePreview(String communityId, String repositoryId, String repositoryFileId, ConnectApi.FilePreviewFormat formatType, ConnectApi.FilePreview result) {}

  public static Void setTestGetFilePreview(String communityId, String repositoryId, String repositoryFileId, ConnectApi.FilePreviewFormat formatType, Integer startPageNumber, Integer endPageNumber, ConnectApi.FilePreview result) {}

  public static Void setTestGetItemType(String repositoryId, String repositoryItemTypeId, ConnectApi.ContentHubItemTypeDetail result) {}

  public static Void setTestGetItemType(String communityId, String repositoryId, String repositoryItemTypeId, ConnectApi.ContentHubItemTypeDetail result) {}

  public static Void setTestGetPreviews(String repositoryId, String repositoryFileId, ConnectApi.FilePreviewCollection result) {}

  public static Void setTestGetPreviews(String communityId, String repositoryId, String repositoryFileId, ConnectApi.FilePreviewCollection result) {}

  public static Void setTestGetRepositories(ConnectApi.ContentHubRepositoryCollection result) {}

  public static Void setTestGetRepositories(String communityId, ConnectApi.ContentHubRepositoryCollection result) {}

  public static Void setTestGetRepositories(Integer pageParam, Integer pageSize, ConnectApi.ContentHubRepositoryCollection result) {}

  public static Void setTestGetRepositories(String communityId, Integer pageParam, Integer pageSize, ConnectApi.ContentHubRepositoryCollection result) {}

  public static Void setTestGetRepository(String repositoryId, ConnectApi.ContentHubRepository result) {}

  public static Void setTestGetRepository(String communityId, String repositoryId, ConnectApi.ContentHubRepository result) {}

  public static Void setTestGetRepositoryFile(String repositoryId, String repositoryFileId, ConnectApi.RepositoryFileDetail result) {}

  public static Void setTestGetRepositoryFile(String repositoryId, String repositoryFileId, Boolean includeExternalFilePermissionsInfo, ConnectApi.RepositoryFileDetail result) {}

  public static Void setTestGetRepositoryFile(String communityId, String repositoryId, String repositoryFileId, ConnectApi.RepositoryFileDetail result) {}

  public static Void setTestGetRepositoryFile(String communityId, String repositoryId, String repositoryFileId, Boolean includeExternalFilePermissionsInfo, ConnectApi.RepositoryFileDetail result) {}

  public static Void setTestGetRepositoryFolder(String repositoryId, String repositoryFolderId, ConnectApi.RepositoryFolderDetail result) {}

  public static Void setTestGetRepositoryFolder(String communityId, String repositoryId, String repositoryFolderId, ConnectApi.RepositoryFolderDetail result) {}

  public static Void setTestGetRepositoryFolderItems(String repositoryId, String repositoryFolderId, ConnectApi.RepositoryFolderItemsCollection result) {}

  public static Void setTestGetRepositoryFolderItems(String communityId, String repositoryId, String repositoryFolderId, ConnectApi.RepositoryFolderItemsCollection result) {}

  public static Void setTestGetRepositoryFolderItems(String repositoryId, String repositoryFolderId, Integer pageParam, Integer pageSize, ConnectApi.RepositoryFolderItemsCollection result) {}

  public static Void setTestGetRepositoryFolderItems(String communityId, String repositoryId, String repositoryFolderId, Integer pageParam, Integer pageSize, ConnectApi.RepositoryFolderItemsCollection result) {}

  public static Void setTestUpdateRepositoryFile(String communityId, String repositoryId, String repositoryFileId, ConnectApi.ContentHubItemInput file, ConnectApi.BinaryInput fileData, ConnectApi.RepositoryFileDetail result) {}

  public static Void setTestUpdateRepositoryFile(String repositoryId, String repositoryFileId, ConnectApi.ContentHubItemInput file, ConnectApi.RepositoryFileDetail result) {}

  public static Void setTestUpdateRepositoryFile(String repositoryId, String repositoryFileId, ConnectApi.ContentHubItemInput file, ConnectApi.BinaryInput fileData, ConnectApi.RepositoryFileDetail result) {}

  public static Void setTestUpdateRepositoryFile(String communityId, String repositoryId, String repositoryFileId, ConnectApi.ContentHubItemInput file, ConnectApi.RepositoryFileDetail result) {}

}