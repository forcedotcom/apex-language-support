/**
 * This class contains authorization request response data.
 */
global class AuthRequestResponse {

  global AuthRequestResponse(String accessToken, String contextRecordId, String authProviderName) {}

  global String getAccessToken() {}

  global String getAuthProviderName() {}

  global String getContextRecordId() {}

  global Object clone() {}

}