/**
 * A record associated with a group.
 */
global class GroupRecord {

  /**
   * Record’s 18-character ID.
   */
  global String id;

  /**
   * Information about the record associated with the group.
   */
  global ConnectApi.ActorWithId record;

  /**
   * Record URL.
   */
  global String url;

}