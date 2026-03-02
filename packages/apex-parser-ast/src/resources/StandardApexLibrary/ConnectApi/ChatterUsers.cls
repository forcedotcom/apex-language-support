/**
 * Access information about users, such as activity, followers, subscriptions, files, and groups.
 */
public class ChatterUsers {

  public static ConnectApi.UserActivitiesJob exportUserActivities(String communityId, String userId) {}

  public static ConnectApi.Subscription follow(String communityId, String userId, String subjectId) {}

  public static ConnectApi.UserChatterSettings getChatterSettings(String communityId, String userId) {}

  public static ConnectApi.FollowerPage getFollowers(String communityId, String userId) {}

  public static ConnectApi.FollowerPage getFollowers(String communityId, String userId, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.FollowingPage getFollowings(String communityId, String userId) {}

  public static ConnectApi.FollowingPage getFollowings(String communityId, String userId, Integer pageParam) {}

  public static ConnectApi.FollowingPage getFollowings(String communityId, String userId, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.FollowingPage getFollowings(String communityId, String userId, String filterType) {}

  public static ConnectApi.FollowingPage getFollowings(String communityId, String userId, String filterType, Integer pageParam) {}

  public static ConnectApi.FollowingPage getFollowings(String communityId, String userId, String filterType, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.Reputation getReputation(String communityId, String userId) {}

  public static ConnectApi.UserSummary getUser(String communityId, String userId) {}

  public static ConnectApi.BatchResult[] getUserBatch(String communityId, List< String > userIds) {}

  public static ConnectApi.UserGroupDetailPage getUserGroups(String communityId, String userId) {}

  public static ConnectApi.UserGroupDetailPage getUserGroups(String communityId, String userId, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.UserPage getUsers(String communityId) {}

  public static ConnectApi.UserPage getUsers(String communityId, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.UserActivitiesJob purgeUserActivities(String communityId, String userId) {}

  public static ConnectApi.UserGroupDetailPage searchUserGroupDetails(String communityId, String userId, String q) {}

  public static ConnectApi.UserGroupDetailPage searchUserGroupDetails(String communityId, String userId, String q, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.UserPage searchUsers(String communityId, String q) {}

  public static ConnectApi.UserPage searchUsers(String communityId, String q, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.UserPage searchUsers(String communityId, String q, String searchContextId, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.UserChatterSettings updateChatterSettings(String communityId, String userId, ConnectApi.GroupEmailFrequency defaultGroupEmailFrequency) {}

  public static ConnectApi.UserDetail updateUser(String communityId, String userId, ConnectApi.UserInput userInput) {}

  public static Void setTestSearchUsers(String communityId, String q, ConnectApi.UserPage result) {}

  public static Void setTestSearchUsers(String communityId, String q, Integer pageParam, Integer pageSize, ConnectApi.UserPage result) {}

  public static Void setTestSearchUsers(String communityId, String q, String searchContextId, Integer pageParam, Integer pageSize, ConnectApi.UserPage result) {}

  public static Void deletePhoto(String communityId, String userId) {}

  public static ConnectApi.UserGroupPage getGroups(String communityId, String userId) {}

  public static ConnectApi.UserGroupPage getGroups(String communityId, String userId, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.Photo getPhoto(String communityId, String userId) {}

  public static ConnectApi.UserGroupPage searchUserGroups(String communityId, String userId, String q) {}

  public static ConnectApi.UserGroupPage searchUserGroups(String communityId, String userId, String q, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.Photo setPhoto(String communityId, String userId, String fileId, Integer versionNumber) {}

  public static ConnectApi.Photo setPhoto(String communityId, String userId, ConnectApi.BinaryInput fileUpload) {}

  public static ConnectApi.Photo setPhotoWithAttributes(String communityId, String userId, ConnectApi.PhotoInput photo) {}

  public static ConnectApi.Photo setPhotoWithAttributes(String communityId, String userId, ConnectApi.PhotoInput photo, ConnectApi.BinaryInput fileUpload) {}

}