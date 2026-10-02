/**
 * Use this interface to provide a class factory that Salesforce can call to create instances of your custom SurveyInvitationLinkShortener.
 * <p>Usage
 * Implement an instance of the SurveyInvitationLinkShortener interface to shorten the survey invitation that can be distributed as short URLs over customer engaged channels, such as SMS, WhatsApp, or Facebook Messenger.
 * <p>Special access rules
 * To implement this interface, you must have the Salesforce Feedback Management license enabled in your Salesforce organization.
 */
global interface SurveyInvitationLinkShortener {
    virtual Boolean equals(Object arg0);

    /**
     * Returns a shortened URL for a given survey invitation.
     */
    abstract String getShortenedURL(String invitationURL);

    virtual Integer hashCode();

    virtual String toString();
}