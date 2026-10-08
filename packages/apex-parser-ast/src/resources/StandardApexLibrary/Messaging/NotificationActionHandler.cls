/**
 * Implement this interface to execute an action on a custom notification.
 */
global interface NotificationActionHandler {
    virtual Boolean equals(Object arg0);

    /**
     * Executes the actionable notification.
     */
    abstract Messaging.ActionResult executeAction(Messaging.ActionableNotification actionableNotification);

    virtual Integer hashCode();

    virtual String toString();
}