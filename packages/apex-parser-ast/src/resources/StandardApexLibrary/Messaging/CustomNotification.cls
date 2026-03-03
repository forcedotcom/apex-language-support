/**
 * CustomNotification is used to create, configure, and send custom notifications from Apex code.
 */
global class CustomNotification {

  /**
   * Sends a custom notification to the specified users.
   * @param users Required. A set of recipient IDs. Each recipient ID corresponds to a recipient or recipient type that the notification should be sent to. Valid recipient or recipient type values are: UserId — The notification is sent to this user, if this user is active. AccountId — The notification is sent to all active users who are members of this account’s Account Team. Note This recipient type is valid if account teams are enabled for your org. OpportunityId — The notification is sent to all active users who are members of this opportunity’s Opportunity Team. Note This recipient type is valid if team selling is enabled for your org. GroupId — The notification is sent to all active users who are members of this group. QueueId — The notification is sent to all active users who are members of this queue. Values can be combined in a set, up to the maximum of 500 values.
   */
  public void send(Set< String > users) {}

  /**
   * Sets the type of the custom notification.
   * @param id The ID of the Custom Notification Type being used for the notification.
   */
  public void setNotificationTypeId(String id) {}

  /**
   * Sets the title of the custom notification.
   * @param title The title of the notification, as it will be seen by recipients. Maximum characters: 250.
   */
  public void setTitle(String title) {}

  /**
   * Sets the body of the custom notification.
   * @param body The body of the notification, as it will be seen by recipients. Maximum characters: 750.
   */
  public void setBody(String body) {}

  /**
   * Sets the sender of the custom notification.
   * @param id The User ID of the sender of the notification.
   */
  public void setSenderId(String id) {}

  /**
   * Sets the target record of the custom notification.
   * @param targetId The Record ID for the target record of the notification.
   */
  public void setTargetId(String targetId) {}

  /**
   * Sets the target page of the custom notification.
   * @param pageRef The PageReference for the navigation target of the notification.
   */
  public void setTargetPageRef(String pageRef) {}

}