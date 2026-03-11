/**
 * Collection of targets that a managed content space folder is shared with.
 */
global class MCSFolderShareCollection {

  /**
   * ID of the managed content space folder.
   */
  global String folderId;

  /**
   * List of targets that a managed content space folder is shared with.
   */
  global List < ConnectApi.MCSFolderShare > shares;

}