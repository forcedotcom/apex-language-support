/**
 * Contains methods for getting and revoking access and refresh tokens that are issued when a user logs in via a single sign-on (SSO) flow that uses an authentication provider, such as Facebook.
 */
public class AuthToken {

  /**
   * Returns an access token for the current user using the specified 18-character identifier of an AuthProvider definition in your org and the proper name of the provider, such as Salesforce or Facebook.
   * @param authProviderId 
   * @param providerName The proper name of the provider. Here are valid values for each provider type. Apple— Apple Custom—For a custom authentication provider, use the value in the FriendlyName field on the AuthProvider object , such as MyProvider . Facebook— Facebook GitHub— GitHub Google— Google Janrain—Use the proper name of the third party, such as Yahoo! . LinkedIn— LinkedIn Microsoft— Microsoft Microsoft Access Control Service— Microsoft Access Control Service MuleSoft— MuleSoft Open ID Connect— Open ID Connect Salesforce— Salesforce Slack— Slack Twitter—This method doesn’t support the Twitter authentication provider.
   * @return String
   */
  public static String getAccessToken(String authProviderId, String providerName) {}

  /**
   * Returns a map from the provider’s identifier to the access token for the currently logged-in Salesforce user. The identifier value depends on the provider. For example, for Salesforce, it’s the user ID, while for Facebook, it’s the user number.
   * @param authProviderId 
   * @param providerName The proper name of the provider. Here are valid values for each provider type. Apple— Apple Custom—For a custom authentication provider, use the value in the FriendlyName field on the AuthProvider object , such as MyProvider . Facebook— Facebook GitHub— GitHub Google— Google Janrain—Use the proper name of the third party, such as Yahoo! . LinkedIn— LinkedIn Microsoft— Microsoft Microsoft Access Control Service— Microsoft Access Control Service MuleSoft— MuleSoft Open ID Connect— Open ID Connect Salesforce— Salesforce Slack— Slack Twitter—This method doesn’t support the Twitter authentication provider.
   * @return Map< String , String >
   */
  public static Map< String , String > getAccessTokenMap(String authProviderId, String providerName) {}

  /**
   * Returns a map from the third-party provider’s identifier containing a refreshed access token for the currently logged-in Salesforce user.
   * @param authProviderId 
   * @param providerName The proper name of the third party. Here are valid values for each provider type. Apple— Apple Custom—For a custom authentication provider, use the value in the FriendlyName field on the AuthProvider object , such as MyProvider . Facebook— Facebook GitHub— GitHub Google— Google Janrain—Use the proper name of the third party, such as Yahoo! . LinkedIn— LinkedIn Microsoft— Microsoft Microsoft Access Control Service— Microsoft Access Control Service MuleSoft— MuleSoft Open ID Connect— Open ID Connect Salesforce— Salesforce Slack— Slack Twitter—This method doesn’t support the Twitter authentication provider.
   * @param oldAccessToken 
   * @return Map< String , String >
   */
  public static Map< String , String > refreshAccessToken(String authProviderId, String providerName, String oldAccessToken) {}

  /**
   * Revokes the access token for a specified SSO user from a provider such as Facebook. You can use this method only if the IsNotSsoUsable field on the associated ThirdPartyAccountLink object is set to false .
   * @param authProviderId The ID of the authentication provider in Salesforce.
   * @param providerName The name of the third party. Here are valid providerName values for each provider type. Important The providerName value that you pass into this method must be lowercase. Apple— apple Custom—For a custom authentication provider, use a lowercase version of the value in the FriendlyName field on the AuthProvider object . For example, if the FriendlyName is MyProvider , use myprovider . Facebook— facebook GitHub— github Google— google Janrain—Use a lowercase version of the name of the third party, such as yahoo! . LinkedIn— linkedin Microsoft— microsoft Microsoft Access Control Service— microsoft access control service MuleSoft— mulesoft Open ID Connect— open id connect Salesforce— salesforce Slack— slack Twitter— twitter
   * @param userId The 15-character ID for the user whose access is being revoked.
   * @param remoteIdentifier The unique ID for the user in the third-party system (this value is in the associated ThirdPartyAccountLink standard object).
   * @return Boolean
   */
  public static Boolean revokeAccess(String authProviderId, String providerName, String userId, String remoteIdentifier) {}

}