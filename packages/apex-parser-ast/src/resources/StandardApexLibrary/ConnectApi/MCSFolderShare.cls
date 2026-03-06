/**
 * Target that a managed content space folder is shared with.
 */
global class MCSFolderShare {

  /**
   * Specifies whether the user has permission to unshare with the target space ( true ) or not ( false ). Content Manager or higher role in the target workspace has permission to unshare.
   */
  global Boolean canUserUnshare;

  /**
   * Status of sharing a managed content space folder. Values are: PendingShare PendingUnshare Shared
   */
  global ConnectApi.MCSFolderShareStatus shareStatus;

  /**
   * ID of the share target.
   */
  global String targetId;

  /**
   * Label of the share target.
   */
  global String targetLabel;

}