/**
 * Use this interface to handle authorization request responses.
 */
global interface AuthRequestHandler {

  RichMessaging.AuthRequestResult handleAuthRequest(RichMessaging.AuthRequestResponse var1);

}