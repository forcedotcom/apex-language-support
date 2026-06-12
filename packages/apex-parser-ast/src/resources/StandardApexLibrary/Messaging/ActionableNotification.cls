/**
 * Contains information about an actionable custom notification.
 */
global class ActionableNotification {

  global ActionableNotification() {}

  global String getActionIdentifier() {}

  global String getNotificationTypeId() {}

  global String getRecipientId() {}

  global String getSenderId() {}

  global String getTargetId() {}

  global String getTargetPageRef() {}

  global Object clone() {}

  /**
   * Contains methods to build an instance of the Messaging.ActionableNotification class, which is used to configure actionable notifications for mobile devices.
   */
  global class Builder {

    global Builder() {}

    global Messaging.ActionableNotification build() {}

    global Messaging.ActionableNotification.Builder withNotificationTypeId(String notificationTypeId) {}

    global Messaging.ActionableNotification.Builder withRecipientId(String recipientId) {}

    global Messaging.ActionableNotification.Builder withSenderId(String senderId) {}

    global Object clone() {}

  }

}