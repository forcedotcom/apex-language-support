/**
 * Access information about followers and subscriptions for records.
 */
global class Chatter {

  global Chatter() {}

  global static void deleteSubscription(String communityId, String subscriptionId) {}

  global static ConnectApi.FollowerPage getFollowers(String communityId, String recordId) {}

  global static ConnectApi.FollowerPage getFollowers(String communityId, String recordId, Integer pageParam, Integer pageSize) {}

  global static ConnectApi.Subscription getSubscription(String communityId, String subscriptionId) {}

  global static ConnectApi.DigestJobRepresentation submitDigestJob(ConnectApi.DigestPeriod period) {}

  global Object clone() {}

}