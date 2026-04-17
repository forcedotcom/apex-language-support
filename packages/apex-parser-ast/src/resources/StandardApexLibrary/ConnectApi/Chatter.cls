/**
 * Access information about followers and subscriptions for records.
 */
global class Chatter {

  public static void deleteSubscription(String communityId, String subscriptionId) {}

  public static ConnectApi.FollowerPage getFollowers(String communityId, String recordId) {}

  public static ConnectApi.FollowerPage getFollowers(String communityId, String recordId, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.Subscription getSubscription(String communityId, String subscriptionId) {}

  public static ConnectApi.DigestJobRepresentation submitDigestJob(ConnectApi.DigestPeriod period) {}

}