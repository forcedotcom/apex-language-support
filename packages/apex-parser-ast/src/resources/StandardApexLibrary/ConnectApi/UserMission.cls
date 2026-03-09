/**
 * Mission details for a user.
 */
global class UserMission extends ConnectApi.AbstractUserMissionActivity {

  /**
   * Name of the mission.
   */
  global String missionName;

  /**
   * Threshold of the mission. When a user reaches this activity count, the mission is achieved.
   */
  global Integer missionThreshold;

}