/**
 * A group summary.
 */
global class RepositoryGroupSummary {

  /**
   * Type of group. Values are: Everybody —Group is public to everybody. EverybodyInDomain —Group is public to everybody in the same domain. Unknown —Group type is unknown.
   */
  global ConnectApi.ContentHubGroupType groupType;

  /**
   * Name of the group.
   */
  global String name;

}