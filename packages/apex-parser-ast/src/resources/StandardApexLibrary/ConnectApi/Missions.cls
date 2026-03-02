/**
 * Export and purge mission activity for users. Get a user’s mission progress. Update mission activity counts for users.
 */
public class Missions {

  public static ConnectApi.UserMissionActivitiesJob exportUserMissionsActivities(String communityId, String userId) {}

  public static ConnectApi.UserMissionActivityCollection getUserMissionsProgress(String communityId, String userId) {}

  public static ConnectApi.UserMissionActivitiesJob purgeUserMissionsActivities(String communityId, String userId) {}

  public static ConnectApi.UserMissionActivitiesJob purgeUserMissionsActivities(String communityId) {}

  public static ConnectApi.UserMissionActivityStatus updateUserMissionActivityCount(ConnectApi.UserMissionActivityType activityType, Integer activityCount, String communityId, String userId) {}

}