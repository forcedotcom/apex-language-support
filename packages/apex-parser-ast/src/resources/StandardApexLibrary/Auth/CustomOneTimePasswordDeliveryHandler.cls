/**
 * To use a custom SMS provider to send one-time passwords (OTPs) for Experience Cloud identity verification, create a class that implements the Auth.CustomOneTimePasswordDeliveryHandler interface.
 */
global interface CustomOneTimePasswordDeliveryHandler {

  Auth.CustomOneTimePasswordDeliveryResult sendOneTimePassword(Id userId, String phoneNumber, String oneTimePassword, String defaultText, Id networkId, String experienceId);

}