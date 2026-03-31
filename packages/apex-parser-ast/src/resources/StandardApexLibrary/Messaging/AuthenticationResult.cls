/**
 * Contains the authentication type and response for inbound emails.
 */
global class AuthenticationResult {

  global InboundEmail.AuthenticationResultField authenticationResultFields;

  global String method;

  global String result;

}