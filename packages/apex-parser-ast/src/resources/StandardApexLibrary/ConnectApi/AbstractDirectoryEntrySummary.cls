/**
 * A directory entry with summary information.
 */
global class AbstractDirectoryEntrySummary {

  /**
   * Domain of the directory entry.
   */
  global String domain;

  /**
   * Email of the directory entry.
   */
  global String email;

  /**
   * ID of the directory entry.
   */
  global String id;

  /**
   * Type of directory entry. Values are: GroupEntry UserEntry
   */
  global ConnectApi.ContentHubDirectoryEntryType type;

}