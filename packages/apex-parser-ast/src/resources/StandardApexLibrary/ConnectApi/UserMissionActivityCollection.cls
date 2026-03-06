/**
 * List of mission activities for a user.
 */
global class UserMissionActivityCollection {

  /**
   * Experience Cloud site in which the user performed activities.
   */
  global ConnectApi.CommunitySummary community;

  /**
   * ID of the user.
   */
  global String userId;

  /**
   * List of mission activities performed by the user.
   */
  global List < ConnectApi.AbstractUserMissionActivity > userMissionActivities;

  /**
   * Name of the user.
   */
  global String userName;

}