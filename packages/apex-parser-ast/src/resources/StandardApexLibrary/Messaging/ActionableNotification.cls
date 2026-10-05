/**
 * Contains information about an actionable custom notification.
 * <p>Example
 * This example shows how to create an ActionableNotification object by using the ActionableNotification.Builder class.
 * Messaging.ActionableNotification notification =
 * new Messaging.ActionableNotification.Builder()
 * .withNotificationTypeId('0MLXXXXXXXXXXXX4AC')
 * .withActionIdentifier('testAction')
 * .withRecipientId('005XXXXXXXXXXXX')
 * .withSenderId('005XXXXXXXXXXXX')
 * .withTargetId('500XXXXXXXXXXXXYAI')
 * .withTargetPageRef('/lightning/r/Case/500XXXXXXXXXXXXYAI/view')
 * .build();
 */
global class ActionableNotification {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Return the unique action identifier (API name) for the custom notification action.
     * <p>This actionIdentifier must belong to the action group associated with the custom notification.
     */
    global String getActionIdentifier() { return null; }

    /**
     * Return the ID of the custom notification type used for the notification.
     */
    global String getNotificationTypeId() { return null; }

    /**
     * Return the user ID of the recipient of the notification.
     */
    global String getRecipientId() { return null; }

    /**
     * Return the user ID of the sender of the notification.
     */
    global String getSenderId() { return null; }

    /**
     * Return the record ID for the target record of the notification.
     */
    global String getTargetId() { return null; }

    /**
     * Return the PageReference for the navigation target of the notification.
     */
    global String getTargetPageRef() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }

    /**
     * Contains methods to build an instance of the Messaging.ActionableNotification class, which is used to configure actionable notifications for mobile devices.
     * <p>Example
     * See the example for the Messaging.ActionableNotification class.
     */
    global class Builder {
        global Builder() { }

        /**
         * Returns an instance of the Messaging.ActionableNotification class.
         */
        global Messaging.ActionableNotification build() { return null; }

        global Messaging.ActionableNotification.Builder clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global override virtual String toString() { return null; }

        /**
         * Sets the unique action identifier (API name) for the custom notification action.
         */
        global Messaging.ActionableNotification.Builder withActionIdentifier(String actionIdentifier) { return null; }

        /**
         * Sets the ID of the custom notification type.
         */
        global Messaging.ActionableNotification.Builder withNotificationTypeId(String notificationTypeId) { return null; }

        /**
         * Sets the user ID of the custom notification recipient.
         */
        global Messaging.ActionableNotification.Builder withRecipientId(String recipientId) { return null; }

        /**
         * Sets the sender of the custom notification.
         */
        global Messaging.ActionableNotification.Builder withSenderId(String senderId) { return null; }

        /**
         * Sets the record ID for the target record of the notification.
         */
        global Messaging.ActionableNotification.Builder withTargetId(String targetId) { return null; }

        /**
         * The PageReference for the navigation target of the notification.
         */
        global Messaging.ActionableNotification.Builder withTargetPageRef(String targetPageRef) { return null; }
    }
}