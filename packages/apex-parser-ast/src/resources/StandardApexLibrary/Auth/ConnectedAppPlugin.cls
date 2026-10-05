/**
 * Contains methods for extending the behavior of a connected app, for example, customizing how a connected app is invoked depending on the protocol used. This class gives you more control over the interaction between Salesforce and your connected app.
 * <p>Usage
 * When you create a connected app, you specify general information about the app and settings for OAuth, web apps, mobile apps, and canvas apps. To customize how the app is invoked, create a connected app handler with this ConnectedAppPlugin Apex class. For example, use this class to support new authentication protocols or respond to user attributes in a way that benefits a business process.
 * When you create a connected app handler, you also configure the ConnectedAppPlugin class to run as an execution user. The execution user authorizes access for the connected app. For example, when you use the authorize method, the execution user authorizes the connected app to access data.
 * If you don't specify an execution user, the plug-in runs as an Automated Process User, which is a system user that executes tasks behind the scenes. Most ConnectedAppPlugin methods require that you specify an execution user, with the exception of the customAttributes method. For more information, see <a class="xref" href="https://help.salesforce.com/articleView?id=xcloud.connected_app_create_custom_handler.htm&amp;type=5&amp;language=en_US" target="_blank" title="HTML (New Window)">Create a Custom Connected App Handler</a>.
 * <p>Example
 * This example authorizes the connected app user to use the connected app if the context is SAML and the user has reached the quota tracked in a custom field. It returns the user’s permission set assignments. The example uses Auth.InvocationContext to modify a SAML assertion before it’s sent to the service provider.
 * global class ConnectedAppPluginExample extends Auth.ConnectedAppPlugin
 * {
 *     // Authorize the app if the user has achieved quota tracked in a custom field
 *     global override Boolean authorize(Id userId, Id connectedAppId, Boolean isAdminApproved, Auth.InvocationContext context)
 *     {
 *         // Create a custom boolean field HasAchievedQuota__c on the user record
 *         // and then uncomment the block below
 *         // User u = [select id, HasAchievedQuota__c from User where id =: userId].get(0);
 *         // return u.HasAchievedQuota__c;
 *
 *         return isAdminApproved;
 *     }
 *
 *     // Call a flow during refresh
 *     global override void refresh(Id userId, Id connectedAppId, Auth.InvocationContext context)
 *     {
 *        try
 *        {
 *           Map<String, Object> inputVariables = new Map<String, Object>();
 *           inputVariables.put('userId', userId);
 *           inputVariables.put('connectedAppId', connectedAppId);
 *
 *          // Create a custom trigger ready flow and uncomment the block below
 *          // Flow.Interview.MyCustomFlow interview = new Flow.Interview.MyCustomFlow(inputVariables);
 *          // interview.start();
 *         } catch ( Exception e ) {
 *            System.debug('FLOW Exception:' + e);
 *         }
 *     }
 *
 *     // Return a user’s permission set assignments
 *     global override Map<String,String> customAttributes(Id userId, Id connectedAppId, Map<String,String>
 *         formulaDefinedAttributes, Auth.InvocationContext context)
 *     {
 *         List<PermissionSetAssignment> psas = [SELECT id, PermissionSet.Name FROM PermissionSetAssignment
 *         WHERE PermissionSet.IsOwnedByProfile = false AND (AssigneeId = :userId)];
 *         String permsets = '[';
 *         for (PermissionSetAssignment psa :psas)
 *         {
 *             permsets += psa.PermissionSet.Name + ';';
 *         }
 *         permsets += ']';
 *         formulaDefinedAttributes.put('PermissionSets', permsets);
 *         return formulaDefinedAttributes;
 *     }
 * }
 */
global abstract class ConnectedAppPlugin {
    global ConnectedAppPlugin() { }

    /**
     * Deprecated and available only in API versions 35.0 and 36.0. As of version 37.0, use authorize(userId, connectedAppId, isAdminApproved, context) instead.
     * @return If the connected app requires admin approval, a returned value of true indicates that the current user is approved.
     */
    @Deprecated
    global virtual Boolean authorize(Id userId, Id connectedAppId, Boolean isAdminApproved) { return false; }

    /**
     * Authorizes the specified user to access the connected app. If the connected app is set for users to self-authorize, this method isn’t invoked.
     * <p>Usage
     * ConnectedAppPlugin runs on behalf of the current user. But the user must have permission to use the connected app for the plug-in to work. Use this method to authorize the user.
     * @return If the connected app requires admin approval, a returned value of true indicates that the user is approved.
     */
    global virtual Boolean authorize(Id userId, Id connectedAppId, Boolean isAdminApproved, Auth.InvocationContext context) { return false; }

    @Deprecated
    global virtual Map customAttributes(Id userId, Map formulaDefinedAttributes) { return null; }

    /**
     * Sets new attributes for the specified user. When the connected app gets the user’s attributes from the UserInfo endpoint or through a SAML assertion, use this method to update the attribute values.
     * @return A map of the updated set of attributes.
     */
    global virtual Map customAttributes(Id userId, Id connectedAppId, Map formulaDefinedAttributes, Auth.InvocationContext context) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Modifies the XML generated by the Salesforce SAML Identity Provider (IDP) before it’s sent to the service provider.
     * <p>Usage
     * Use this method to modify the XML SAML response to perform an action based on the context of the SAML request before it’s verified, signed, and sent to the target service provider. This method enables developers to extend the connected app plug-in to meet their specific needs.
     * The developer assumes full responsibility for changes made within the connected app plug-in. The plug-in must include validation and error handling. If the plug-in throws an exception, catch it, log it, and stop the process. Don’t send anything to the target service provider.
     * @return Returns an instance of Dom.XmlNode containing the modified SAML XML response.
     */
    global virtual dom.XmlNode modifySAMLResponse(Map authSession, Id connectedAppId, dom.XmlNode samlResponse) { return null; }

    /**
     * Deprecated and available only in API versions 35.0 and 36.0. As of version 37.0, use refresh(userId, connectedAppId, context) instead.
     */
    @Deprecated
    global virtual void refresh(Id userId, Id connectedAppId) { }

    /**
     * Salesforce calls this method during a refresh token exchange.
     */
    global virtual void refresh(Id userId, Id connectedAppId, Auth.InvocationContext context) { }

    global override virtual String toString() { return null; }
}