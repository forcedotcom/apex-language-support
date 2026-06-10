/**
 * Contains methods for extending the behavior of an external client app. For example, customize how an external client app is invoked depending on the protocol used. This class gives you more control over the interaction between Salesforce and your external client app.
 */
global class ExternalClientAppOauthHandler {

  global ExternalClientAppOauthHandler() {}

  global Boolean authorize(Id userId, Id ecAppId, Boolean isAdminApproved, Auth.InvocationContext context) {}

  global Map<String,String> customAttributes(Id userId, Id ecAppId, Map<String,String> formulaDefinedAttributes, Auth.InvocationContext context) {}

  global void refresh(Id userId, Id ecAppId, Auth.InvocationContext context) {}

  global Object clone() {}

}