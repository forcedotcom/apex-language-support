/**
 * A folder item.
 */
global class RepositoryFolderItem {

  /**
   * If the folder item is a file, the file summary. If the folder item is a folder, null .
   */
  global ConnectApi.RepositoryFileSummary file;

  /**
   * If the folder item is a folder, the folder summary. If the folder item is a file, null .
   */
  global ConnectApi.RepositoryFolderSummary folder;

  /**
   * Type of item in a folder. Values are: file folder
   */
  global ConnectApi.FolderItemType type;

}