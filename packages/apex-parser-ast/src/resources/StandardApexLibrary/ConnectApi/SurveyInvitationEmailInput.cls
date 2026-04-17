/**
 * Survey invitation email.
 */
global class SurveyInvitationEmailInput {

  /**
   * Specifies whether participants who don't have a Salesforce account can respond ( true ) or not ( false ).
   */
  global Boolean allowGuestUserResponse;

  /**
   * Specifies whether participants can see their responses ( true ) or not ( false ).
   */
  global Boolean allowParticipantsAccessTheirResponse;

  /**
   * Maps each recipient with another record that must be associated with the recipient's survey invitation.
   */
  global List < ConnectApi.AssociateRecordsWithRecipientInput > associateRecordsWithRecipients;

  /**
   * Content of the email. Specify the email body in case you don't specify an email template. The email body must contain one of these merge fields: To embed a link to launch the survey: [[SURVEY_INVITATION_URL]] To embed a survey question: {{{SurveyQuestion.QuestionName}}} and {{{SurveyQuestion.QuestionHtmlContent}}}
   */
  global String body;

  /**
   * Specifies whether participants can respond anonymously ( true ) or not ( false ).
   */
  global Boolean collectAnonymousResponse;

  /**
   * ID of the site that's used to open the survey for users outside your org.
   */
  global String communityId;

  /**
   * ID of the Lightning email template that's used to send the survey invitation. The template must contain the required merge fields that embed either the survey link or a question in the email. Only Lightning email templates are used to send survey invitations.
   */
  global String emailTemplateId;

  /**
   * Email ID of the user or the org-wide email address associated with the user's profile.
   */
  global String fromEmailAddress;

  /**
   * Date on which the survey invitation expires.
   */
  global Datetime invitationExpirationDate;

  /**
   * ID of the owner of the survey invitation records.
   */
  global String invitationOwner;

  /**
   * Specifies whether a unique invitation is created for each participant ( true ) or not ( false ). When a participant responds using a personal invitation, the response record is associated with the participant's Salesforce record.
   */
  global Boolean isPersonalInvitation;

  /**
   * Maps each recipient with the context based on which the survey invitation is emailed.
   */
  global List < ConnectApi.RecipientEngagementContextInput > recipientEngagementContexts;

  /**
   * List of up to 300 IDs of leads, contacts, or users to whom the survey invitation is emailed.
   */
  global List < String > recipients;

  /**
   * Specifies whether to send the email through Marketing Cloud ( true ) or not ( false ). If unspecified, defaults to false .
   */
  global Boolean sendEmailThroughUma;

  /**
   * IDs of the users with whom the survey invitation records must be shared. The invitation records are shared with Read access.
   */
  global List < String > shareInvitationsWith;

  /**
   * Subject of the email. Specify the subject in case you don't specify an email template.
   */
  global String subject;

  /**
   * IDs of the questions that are embedded in the email. You can send an email invitation for questions of these types: Net Promoter Score (NPS), rating, and score.
   */
  global List < String > surveyQuestionIds;

}