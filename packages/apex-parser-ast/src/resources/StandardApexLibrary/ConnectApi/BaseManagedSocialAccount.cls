/**
 * Base information describing a managed social account or fan page of a social network.
 */
global class BaseManagedSocialAccount {

  /**
   * Default response account to use when replying to posts sent to this account.
   */
  global String defaultResponseAccountId;

  /**
   * Real name (or user name if real name not available) for this account on the social network.
   */
  global String displayName;

  /**
   * URL to the account's avatar image.
   */
  global String externalPictureUrl;

  /**
   * Internal SFDC ID for this managed social account.
   */
  global String id;

  /**
   * Label for the social account.
   */
  global String label;

  /**
   * URL to the account's profile.
   */
  global String profileUrl;

  /**
   * Social network that this account belongs to. Values are: Facebook GooglePlus Instagram InstagramBusiness KakaoTalk Kik Line LinkedIn Messenger Other Pinterest QQ Rypple SinaWeibo SMS Snapchat Telegram Twitter VKontakte WeChat WhatsApp YouTube
   */
  global ConnectApi.SocialNetworkProvider socialNetwork;

  /**
   * Unique name used for distinguishing same name fan pages; acts like a user name for a fan page.
   */
  global String uniqueName;

  /**
   * Unique user name or handle for this account on the social network.
   */
  global String username;

}