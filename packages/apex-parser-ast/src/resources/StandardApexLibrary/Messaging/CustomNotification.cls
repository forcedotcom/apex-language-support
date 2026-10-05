/**
 * CustomNotification is used to create, configure, and send custom notifications from Apex code.
 * <p>Usage
 * CustomNotification allows two approaches to creating and configuring a custom notification.
 * Create an instance with the default constructor, and then set notification attributes using the various setter methods.
 * Create an instance and configure notification parameters at the same time using the parameterized constructor.
 * Once the custom notification is configured, call send() to send the notification.
 * Notification Target
 * The notification target is used by the receiving client application to navigate to an appropriate record or page when a user responds to a notification. For example, when a user is notified that a record was updated, responding to the notification can open the relevant record.
 * You must specify a target for a notification. The target can be specified using either the targetID or the targetPageRef attribute. Neither attribute is required, but if both are omitted, send() throws an exception. If there’s no natural target for a notification, set the targetID to a dummy value, such as 000000000000000AAA. A dummy value prevents the exception, and also prevents automatic navigation when responding to the notification in the client app.
 * You can set both targetID and targetPageRef in the same notification. The client app that receives the notification determines which target, if any, to use when responding to the notification.
 * Important
 * Before Winter ’21 you could set only a target record (targetID) for a notification. Most client applications expect to find a targetID in the notification payload. If you can’t update a client app to handle notifications that include only a targetPageRef, set the targetID to a dummy value.
 * Execution Context and Notification Permissions
 * By default, Apex code executes in user mode, which means that user permissions on objects and field-level security are respected. A user cannot run code that tries to access fields or objects that are hidden from the user. Therefore, to send notifications with CustomNotification, you must have the Send Custom Notifications user permission. If you don’t have the required permission, the send() method fails.
 * <p>Example
 * This example Apex class provides a static method for sending a custom notification to a recipient list. Call this method from a trigger, flow, or wherever you want to send a custom notification from Apex.
 * public without sharing class CustomNotificationFromApex {
 *     public static void notifyUsers(Set<String> recipientsIds, String targetId, String actionGroupId) {
 *         // Get the Id for our custom notification type
 *         CustomNotificationType notificationType =
 *             [SELECT Id, DeveloperName
 *              FROM CustomNotificationType
 *              WHERE DeveloperName='Custom_Notification'
 *              WITH USER_MODE
 *              LIMIT 1];
 *
 *         // Create a new custom notification
 *         Messaging.CustomNotification notification = new Messaging.CustomNotification();
 *
 *         // Set the contents for the notification
 *         notification.setTitle('Apex Custom Notification');
 *         notification.setBody('The notifications are coming from INSIDE the Apex!');
 *
 *         // Set the notification type and target
 *         notification.setNotificationTypeId(notificationType.Id);
 *         notification.setTargetId(targetId);
 *
 *         // Set the Action Group (This makes the notification actionable)
 *         if (String.isNotBlank(actionGroupId)) {
 *             notification.setActionGroupId(actionGroupId);
 *         }
 *
 *         // Actually send the notification
 *         try {
 *             notification.send(recipientsIds);
 *         }
 *         catch (Exception e) {
 *             System.debug('Problem sending notification: ' + e.getMessage());
 *         }
 *     }
 * }
 * Note
 * This example uses a custom notification type with the DeveloperName (API name) Custom_Notification. You can create a custom notification type using <a class="xref" href="https://help.salesforce.com/s/articleView?id=platform.notif_builder.htm&amp;language=en_US" target="_blank" title="HTML (New Window)">Notification Builder in Setup</a> or <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api_tooling.meta/api_tooling/tooling_api_objects_customnotificationtype.htm" target="_blank" title="HTML (New Window)">Tooling API</a>. Then, use your notification type’s DeveloperName (API name) in the query to find the ID of the notification type.
 * CustomNotification.send() can throw an exception, which is handled minimally in this example. Add more substantial error handling to code you plan to use in production.
 */
global class CustomNotification {
    /**
     * Creates a new instance of the Messaging.CustomNotification class.
     */
    global CustomNotification() { }

    /**
     * Creates an instance of the Messaging.CustomNotification class using the specified parameters. When you use this constructor, you don’t need to call the various setter methods to define the custom notification attributes.
     * <p>Usage
     * A client may see a truncated notification title or body depending on the delivery channel or app, and how the Connect API notification parameters are configured. For more information on the trimMessages query parameter, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.chatterapi.meta/chatterapi/connect_resources_notifications_list.htm" target="_blank" title="HTML (New Window)">Notification </a>.
     */
    global CustomNotification(String typeId, String sender, String title, String body, String targetId, String targetPageRef) { }

    global CustomNotification(String typeId, String sender, String title, String body, String targetId, String targetPageRef, String actionGroup) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sends a custom notification to the specified users.
     * <p>Example
     * See the Custom Notification Example.
     */
    global void send(Set users) { }

    global void setActionGroup(String actionGroup) { }

    /**
     * Sets the body of the custom notification.
     * <p>Example
     * See the Custom Notification Example.
     */
    global void setBody(String body) { }

    /**
     * Sets the type of the custom notification.
     * <p>Example
     * See the Custom Notification Example.
     */
    global void setNotificationTypeId(String id) { }

    /**
     * Sets the sender of the custom notification.
     * <p>Example
     * See the Custom Notification Example.
     */
    global void setSenderId(String id) { }

    /**
     * Sets the target record of the custom notification.
     * <p>Example
     * See the Custom Notification Example.
     */
    global void setTargetId(String targetId) { }

    /**
     * Sets the target page of the custom notification.
     * <p>Example
     * See the Custom Notification Example.
     */
    global void setTargetPageRef(String pageRef) { }

    /**
     * Sets the title of the custom notification.
     * <p>Example
     * See the Custom Notification Example.
     */
    global void setTitle(String title) { }

    global override virtual String toString() { return null; }
}