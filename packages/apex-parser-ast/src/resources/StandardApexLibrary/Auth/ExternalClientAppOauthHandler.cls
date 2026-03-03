/**
 * Contains methods for extending the behavior of an external client app. For example, customize how an external client app is invoked depending on the protocol used. This class gives you more control over the interaction between Salesforce and your external client app.
 */
global class ExternalClientAppOauthHandler {

  public Boolean authorize(Id userId, Id ecAppId, Boolean isAdminApproved, Auth.InvocationContext context) {}

  public Map<String,String> customAttributes(Id userId, Id ecAppId, String> formulaDefinedAttributes, Auth.InvocationContext context) {}

  public void refresh(Id userId, Id ecAppId, Auth.InvocationContext context) {}

}