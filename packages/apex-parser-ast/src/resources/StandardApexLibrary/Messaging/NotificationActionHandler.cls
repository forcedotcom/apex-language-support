/**
 * Implement this interface to execute an action on a custom notification.
 */
global interface NotificationActionHandler {

  Messaging.ActionResult executeAction(Messaging.ActionableNotification actionableNotification);

}