/**
 * User activity summary.
 */
global class UserActivitySummary {

  /**
   * Date of the user activity.
   */
  global Datetime activityDate;

  /**
   * Type of user activity. Values are: Bookmark —User bookmarked a post. ChatterActivity —Total counts of posts and comments made and likes and comments received for a user. ChatterLike —User liked a post or comment. Comment —User commented on a post. CompanyVerify —User verified comment. DownVote —User downvoted a post or comment. FeedEntityRead —User read a post. FeedRead —User read a feed. Mute —User muted a post. Post —User made a post. TopicEndorsement —User endorsed another user on a topic or received endorsement on a topic. UpVote —User upvoted a post or comment.
   */
  global String activityType;

  /**
   * URL to the user activity.
   */
  global String activityUrl;

  /**
   * Experience Cloud site in which the user performed the activity.
   */
  global ConnectApi.CommunitySummary community;

}