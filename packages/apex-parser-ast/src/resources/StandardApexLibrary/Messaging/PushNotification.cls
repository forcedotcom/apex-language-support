/**
 * PushNotification is used to configure push notifications and send them from an Apex trigger.
 * <p>Example
 * This sample Apex trigger sends push notifications to the external client app named Test_App, which corresponds to a mobile app on iOS mobile clients. The trigger fires after cases have been updated and sends the push notification to two users: the case owner and the user who last modified the case.
 * trigger caseAlert on Case (after update) {
 *
 *     for(Case cs : Trigger.New)
 *     {
 *         // Instantiating a notification
 *         Messaging.PushNotification msg =
 *             new Messaging.PushNotification();
 *
 *         // Assembling the necessary payload parameters for Apple.
 *         // Apple params are:
 *         // (<alert text>,<alert sound>,<badge count>,
 *         // <free-form data>)
 *         // This example doesn't use badge count or free-form data.
 *         // The number of notifications that haven't been acted
 *         // upon by the intended recipient is best calculated
 *         // at the time of the push. This timing helps
 *         // ensure accuracy across multiple target devices.
 *         Map<String, Object> payload =
 *             Messaging.PushNotificationPayload.apple(
 *                 'Case ' + cs.CaseNumber + ' status changed to: '
 *                 + cs.Status, '', null, null);
 *
 *         // Adding the assembled payload to the notification
 *         msg.setPayload(payload);
 *
 *         // Getting recipient users
 *         String userId1 = cs.OwnerId;
 *         String userId2 = cs.LastModifiedById;
 *
 *         // Adding recipient users to list
 *         Set<String> users = new Set<String>();
 *         users.add(userId1);
 *         users.add(userId2);
 *
 *         // Sending the notification to the specified app and users.
 *         // Here we specify the API name of the external client app.
 *         msg.send('Test_App', users);
 *     }
 * }
 */
global class PushNotification {
    global PushNotification() { }

    global PushNotification(Map payload) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sends a push notification message to the specified users.
     * <p>Example
     * See the Push Notification Example.
     */
    global void send(String application, Set users) { }

    /**
     * Sets the payload of the push notification message.
     * <p>Example
     * See the Push Notification Example.
     */
    global void setPayload(Map payload) { }

    /**
     * Reserved for future use.
     */
    global void setTtl(Integer ttl) { }

    global override virtual String toString() { return null; }
}