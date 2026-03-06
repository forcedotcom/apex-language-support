/**
 * If a feed element has this capability, it can interact with a social post on a social network.
 */
global class SocialPostCapability {

  /**
   * Social account that authored the social post.
   */
  global ConnectApi.SocialAccount author;

  /**
   * Content body of the social post.
   */
  global String content;

  /**
   * User who deleted the social post.
   */
  global ConnectApi.UserSummary deletedBy;

  /**
   * User who hid the social post.
   */
  global ConnectApi.UserSummary hiddenBy;

  /**
   * Icon of the social network.
   */
  global ConnectApi.Icon icon;

  /**
   * ID associated with the social post Salesforce record.
   */
  global String id;

  /**
   * If true , the social post originated from the Salesforce application.
   */
  global Boolean isOutbound;

  /**
   * External social account who liked the social post.
   */
  global String likedBy;

  /**
   * Message type of the social post. Values are: Comment Direct Post PrivateMessage Reply Retweet Tweet
   */
  global ConnectApi.SocialPostMessageType messageType;

  /**
   * Title or heading of the social post.
   */
  global String name;

  /**
   * External URL to the social post on the social network.
   */
  global String postUrl;

  /**
   * Social network that this social post belongs to. Values are: Facebook GooglePlus Instagram InstagramBusiness KakaoTalk Kik Line LinkedIn Messenger Other Pinterest QQ Rypple SinaWeibo SMS Snapchat Telegram Twitter VKontakte WeChat WhatsApp YouTube
   */
  global ConnectApi.SocialNetworkProvider provider;

  /**
   * Social account that is the recipient of the social post.
   */
  global ConnectApi.SocialAccount recipient;

  /**
   * ID of the recipient of the social post.
   */
  global String recipientId;

  /**
   * Review scale of the social post.
   */
  global Double reviewScale;

  /**
   * Review score of the social post.
   */
  global Double reviewScore;

  /**
   * Status of the social post.
   */
  global ConnectApi.SocialPostStatus status;

}