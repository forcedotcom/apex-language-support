/**
 * This class contains the result from handling the authorization request response.
 */
global class AuthRequestResult {

  global AuthRequestResult(System.PageReference redirectPageReference, RichMessaging.AuthRequestResultStatus resultStatus, Datetime expirationDateTime) {}

  global Datetime expirationDateTime;

  global System.PageReference redirectPageReference;

  global RichMessaging.AuthRequestResultStatus resultStatus;

  global Object clone() {}

}