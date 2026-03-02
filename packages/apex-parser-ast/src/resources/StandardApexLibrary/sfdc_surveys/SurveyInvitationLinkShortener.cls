/**
 * Use this interface to provide a class factory that Salesforce can call to create instances of your custom SurveyInvitationLinkShortener .
 */
public interface SurveyInvitationLinkShortener {

  String getShortenedURL(String var1);

}