/**
 * Defines who a captured email or event is shared with.
 */
global class ActivitySharingInput {

  /**
   * List of IDs for the groups that you share the activity with. Valid only if sharingType is MyGroups .
   */
  global List < String > groupsToShareWith;

  /**
   * Type of sharing operation. Values are: Everyone —The activity is shared with everyone. MyGroups —The activity is shared only with a selection of the context user’s groups. OnlyMe —The activity is private.
   */
  global ConnectApi.ActivitySharingType sharingType;

}