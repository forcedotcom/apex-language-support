/**
 * Send survey invitations by email.
 */
global class Surveys {

  global Surveys() {}

  global static ConnectApi.SurveyInvitationEmailOutput sendSurveyInvitationEmail(String surveyID, ConnectApi.SurveyInvitationEmailInput SurveyEmailInput) {}

  global Object clone() {}

}