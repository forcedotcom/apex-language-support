/**
 * Represents a successfully enqueued API digest job request.
 */
global class DigestJob {

  /**
   * Time period that’s included in a Chatter email digest. Values are: DailyDigest —The email includes up to the 50 latest posts from the previous day. WeeklyDigest —The email includes up to the 50 latest posts from the previous week.
   */
  global ConnectApi.DigestPeriod period;

}