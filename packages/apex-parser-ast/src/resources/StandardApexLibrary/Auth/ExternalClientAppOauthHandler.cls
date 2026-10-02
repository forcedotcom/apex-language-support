/**
 * Contains methods for extending the behavior of an external client app. For example, customize how an external client app is invoked depending on the protocol used. This class gives you more control over the interaction between Salesforce and your external client app.
 * <p>Usage
 * When you create an external client app, you specify general information about the app and settings for OAuth. To customize how the app is invoked, create a external client app handler with the ExternalClientAppOauthHandler Apex class. For example, use this class to support new authentication protocols or respond to user attributes in a way that benefits the business process.
 * When you create an external client app handler, you also configure the ExternalClientAppOauthHandler class to run as an execution user. The execution user authorizes access for the external client app. For example, when you use the authorize method, the execution user authorizes the external client app to access data.
 * If you don't specify an execution user, the plug-in runs as an Automated Process User, which is a system user that executes tasks behind the scenes. Most ExternalClientAppOauthHandler methods require that you specify an execution user, with the exception of the customAttributes method.
 */
global virtual class ExternalClientAppOauthHandler {
    global Object ExternalClientAppOauthHandler() { return null; }

    /**
     * Authorizes the specified user to access the external client app. If the external client app is set for users to self-authorize, this method isn’t invoked.
     * @return A returned value of true indicates that the user is approved.
     */
    global virtual Boolean authorize(Id userId, Id ecAppId, Boolean isAdminApproved, Auth.InvocationContext context) { return false; }

    /**
     * Sets new attributes for the specified user. When the external client app gets the user’s attributes from the UserInfo endpoint, use this method to update the attribute values.
     * @return A map of the updated set of attributes.
     */
    global virtual Map customAttributes(Id userId, Id ecAppId, Map formulaDefinedAttributes, Auth.InvocationContext context) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Salesforce calls this method during a refresh token exchange.
     */
    global virtual void refresh(Id userId, Id ecAppId, Auth.InvocationContext context) { }

    global override virtual String toString() { return null; }
}