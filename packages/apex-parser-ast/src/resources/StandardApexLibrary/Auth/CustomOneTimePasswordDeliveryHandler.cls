/**
 * To use a custom SMS provider to send one-time passwords (OTPs) for Experience Cloud identity verification, create a class that implements the Auth.CustomOneTimePasswordDeliveryHandler interface.
 */
global interface CustomOneTimePasswordDeliveryHandler {
    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    /**
     * Calls out to an external SMS messaging provider to send a Salesforce one-time password to an external user for identity verification. Returns an Auth.CustomOneTimePasswordDeliveryResult indicating whether the provider sent the message.
     */
    abstract Auth.CustomOneTimePasswordDeliveryResult sendOneTimePassword(Id userId, String phoneNumber, String oneTimePassword, String defaultText, Id networkId, String experienceId);

    virtual String toString();
}