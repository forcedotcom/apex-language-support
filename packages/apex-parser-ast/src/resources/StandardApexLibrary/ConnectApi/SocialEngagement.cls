/**
 * Manage information about social accounts or fan pages for social networks.
 */
global class SocialEngagement {

  global SocialEngagement() {}

  global static ConnectApi.DeleteSocialPostIntent deleteSocialPost(String socialPostId, String socialAccountId) {}

  global static ConnectApi.FollowSocialPersonaIntent followSocialPersona(String socialPersonaId, String socialAccountId) {}

  global static ConnectApi.FollowSocialPersonaIntent followSocialPostPersona(String socialPostId, String socialAccountId) {}

  global static ConnectApi.SocialPostIntents getIntents(String socialPostId) {}

  global static ConnectApi.ManagedSocialAccount getManagedSocialAccount(String id) {}

  global static ConnectApi.ManagedSocialAccounts getManagedSocialAccounts() {}

  global static ConnectApi.ManagedSocialAccounts getManagedSocialAccounts(ConnectApi.SocialNetworkProvider socialNetwork) {}

  global static ConnectApi.SocialAccountRelationship getRelationship(String id, String socialPersonaId) {}

  global static ConnectApi.HideSocialPostIntent hideSocialPost(String socialPostId, String socialAccountId) {}

  global static ConnectApi.LikeSocialPostIntent likeSocialPost(String socialPostId, String socialAccountId) {}

  global static ConnectApi.SocialPostMassApprovalOutput massApprove(ConnectApi.SocialPostMassApprovalInput massApproval) {}

  global static void recallApproval(String socialPostId) {}

  global static void unfollowSocialPersona(String socialPersonaId, String socialAccountId) {}

  global static void unfollowSocialPostPersona(String socialPostId, String socialAccountId) {}

  global static void unhideSocialPost(String socialPostId, String socialAccountId) {}

  global static void unlikeSocialPost(String socialPostId, String socialAccountId) {}

  global Object clone() {}

}