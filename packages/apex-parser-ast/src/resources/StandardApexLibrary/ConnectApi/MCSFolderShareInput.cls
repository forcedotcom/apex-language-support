/**
 * Target to share a managed content space folder with.
 */
global class MCSFolderShareInput {

  /**
   * ID of the target to share the managed content space folder with. Supported target IDs are the root folder IDs of workspaces. To get the root folder ID for a space, use the getManagedContentSpace(contentSpaceId) method.
   */
  global String targetId;

}