/**
 * Contains information about an actionable custom notification.
 */
global class ActionableNotification {

  global ActionableNotification() {}

  public String getActionIdentifier() {}

  public String getNotificationTypeId() {}

  public String getRecipientId() {}

  public String getSenderId() {}

  public String getTargetId() {}

  public String getTargetPageRef() {}

  global Object clone() {}

  /**
   * Contains methods to build an instance of the Messaging.ActionableNotification class, which is used to configure actionable notifications for mobile devices.
   */
  global class Builder {

    global Builder() {}

    public Messaging.ActionableNotification build() {}

    public Messaging.ActionableNotification.Builder withNotificationTypeId(String notificationTypeId) {}

    public Messaging.ActionableNotification.Builder withRecipientId(String recipientId) {}

    public Messaging.ActionableNotification.Builder withSenderId(String senderId) {}

    global Object clone() {}

  }

}