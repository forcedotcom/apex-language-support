/**
 * Subscription.
 */
global class Subscription {

  /**
   * Information about the Experience Cloud site in which the subscription exists.
   */
  global ConnectApi.Reference community;

  /**
   * Subscription’s 18–character ID.
   */
  global String id;

  /**
   * Information about the parent, that is, the thing or person being followed.
   */
  global ConnectApi.Actor subject;

  /**
   * Information about the subscriber, that is, the person following this item.
   */
  global ConnectApi.Actor subscriber;

  /**
   * Connect REST API URL to this specific subscription.
   */
  global String url;

}