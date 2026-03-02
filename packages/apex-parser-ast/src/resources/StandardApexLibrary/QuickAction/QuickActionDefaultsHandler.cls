/**
 * The QuickAction.QuickActionDefaultsHandler interface lets you specify the default values for the standard Email and Send Email actions in the case feed. You can use this interface to specify the From address, CC address, BCC address, subject, and email body for the Email action in the case feed. You can use the interface to pre-populate these fields based on the context where the action is displayed, such as the case origin (for example, country) and subject.
 */
public interface QuickActionDefaultsHandler {

  /**
   * Implement this method to provide default values for the standard Email action in the case feed.
   * @param actionDefaults This array contains only one item of type QuickAction.SendEmailQuickActionDefaults .
   */
  void onInitDefaults(QuickAction.QuickActionDefaults[] actionDefaults);

}