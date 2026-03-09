/**
 * If a comment has this capability, users with permission can mark it as verified or unverified.
 */
global class VerifiedCapability extends ConnectApi.FeedElementCapability {

  /**
   * Specifies whether the context user has permission to mark comments as verified or unverified ( true ) or not ( false ).
   */
  global Boolean isVerifiableByMe;

  /**
   * Specifies whether the comment is marked as verified ( true ) or not ( false ).
   */
  global Boolean isVerified;

  /**
   * Specifies whether the comment is marked as verified by an anonymous user ( true ) or not ( false ). If the comment has never been marked as verified or unverified, null . Also null if the context user doesn’t have permission to mark comments as verified or unverified.
   */
  global Boolean isVerifiedByAnonymized;

  /**
   * User who last marked the comment as verified or unverified, otherwise null . Also null if the context user doesn’t have permission to mark comments as verified or unverified.
   */
  global ConnectApi.UserSummary lastVerifiedByUser;

  /**
   * Date when the comment was last marked as verified or unverified, otherwise null . Also null if the context user doesn’t have permission to mark comments as verified or unverified.
   */
  global Datetime lastVerifiedDate;

}