/**
 * Implement this interface to trigger a custom Apex class when the conditions for a report notification are met.
 * Usage
 * Report notifications for reports that users have subscribed to can trigger a custom Apex class, which must implement the Reports.NotificationAction interface. The execute method in this interface receives a NotificationActionContext object as a parameter, which contains information about the report instance and the conditions that must be met for a notification to be triggered.
 */
global interface NotificationAction {
    virtual Boolean equals(Object arg0);

    /**
     * Executes the custom Apex action specified in the context parameter of the context object, NotificationActionContext. The object contains information about the report instance and the conditions that must be met for a notification to be triggered. The method executes whenever the specified conditions are met.
     */
    abstract void execute(reports.NotificationActionContext notificationContext);

    virtual Integer hashCode();

    virtual String toString();
}