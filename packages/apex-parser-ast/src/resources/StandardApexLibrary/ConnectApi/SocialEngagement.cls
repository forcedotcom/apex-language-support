/**
 * Manage information about social accounts or fan pages for social networks.
 */
public class SocialEngagement {

  public static ConnectApi.DeleteSocialPostIntent deleteSocialPost(String socialPostId, String socialAccountId) {}

  public static ConnectApi.FollowSocialPersonaIntent followSocialPersona(String socialPersonaId, String socialAccountId) {}

  public static ConnectApi.FollowSocialPersonaIntent followSocialPostPersona(String socialPostId, String socialAccountId) {}

  public static ConnectApi.SocialPostIntents getIntents(String socialPostId) {}

  public static ConnectApi.ManagedSocialAccount getManagedSocialAccount(String id) {}

  public static ConnectApi.ManagedSocialAccounts getManagedSocialAccounts() {}

  public static ConnectApi.ManagedSocialAccounts getManagedSocialAccounts(ConnectApi.SocialNetworkProvider socialNetwork) {}

  public static ConnectApi.SocialAccountRelationship getRelationship(String id, String socialPersonaId) {}

  public static ConnectApi.HideSocialPostIntent hideSocialPost(String socialPostId, String socialAccountId) {}

  public static ConnectApi.LikeSocialPostIntent likeSocialPost(String socialPostId, String socialAccountId) {}

  public static ConnectApi.SocialPostMassApprovalOutput massApprove(ConnectApi.SocialPostMassApprovalInput massApproval) {}

  public static Void recallApproval(String socialPostId) {}

  public static Void unfollowSocialPersona(String socialPersonaId, String socialAccountId) {}

  public static Void unfollowSocialPostPersona(String socialPostId, String socialAccountId) {}

  public static Void unhideSocialPost(String socialPostId, String socialAccountId) {}

  public static Void unlikeSocialPost(String socialPostId, String socialAccountId) {}

}