/**
 * Implement this interface to trigger a custom Apex class when the conditions for a report notification are met.
 */
global interface NotificationAction {

  /**
   * Executes the custom Apex action specified in the context parameter of the context object, NotificationActionContext . The object contains information about the report instance and the conditions that must be met for a notification to be triggered. The method executes whenever the specified conditions are met.
   * @param context 
   */
  void execute(Reports.NotificationActionContext context);

}