/**
 * Update the targets that a managed content space folder is shared with.
 */
global class MCSFolderShareCollectionUpdateInput {

  /**
   * List of target IDs to share the managed content space folder with. Supported target IDs are the root folder IDs of workspaces. To get the root folder ID for a space, use the getManagedContentSpace(contentSpaceId) method.
   */
  global List < ConnectApi.MCSFolderShareInput > shareWith;

  /**
   * Comma-separated list of target IDs to unshare the managed content space folder with.
   */
  global List < String > unshareWith;

}