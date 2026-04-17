/**
 * A repository folder.
 */
global class AbstractRepositoryFolder extends ConnectApi.AbstractRepositoryItem {

  /**
   * URL of this folder in the external system.
   */
  global String externalFolderUrl;

  /**
   * URL that lists the files and folders in this folder.
   */
  global String folderItemsUrl;

  /**
   * Absolute path of the folder in the external system.
   */
  global String path;

}