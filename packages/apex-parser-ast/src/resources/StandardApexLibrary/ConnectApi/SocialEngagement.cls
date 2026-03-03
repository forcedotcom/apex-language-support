/**
 * Manage information about social accounts or fan pages for social networks.
 */
global class SocialEngagement {

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

  public static void recallApproval(String socialPostId) {}

  public static void unfollowSocialPersona(String socialPersonaId, String socialAccountId) {}

  public static void unfollowSocialPostPersona(String socialPostId, String socialAccountId) {}

  public static void unhideSocialPost(String socialPostId, String socialAccountId) {}

  public static void unlikeSocialPost(String socialPostId, String socialAccountId) {}

}