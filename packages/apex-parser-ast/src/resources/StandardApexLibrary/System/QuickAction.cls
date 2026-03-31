/**
 * Use Apex to request and process actions on objects that allow custom fields, on objects that appear in a Chatter feed, or on objects that are available globally.
 */
global class QuickAction {

  /**
   * Returns metadata information for the available quick actions of the provided parent object.
   * @param parentType The parent object type. This can be an object type name ('Account') or 'Global' (meaning that this method is called at a global level and not an entity level).
   * @return List<QuickAction.DescribeAvailableQuickActionResult>
   */
  public static List<QuickAction.DescribeAvailableQuickActionResult> describeAvailableQuickActions(String parentType) {}

  /**
   * Returns the metadata information for the provided quick actions.
   * @param sObjectNames The names of the quick actions. The quick action name can contain the entity name if it is at the entity level ('Account.QuickCreateContact'), or 'Global' if used for the action at the global level ('Global.CreateNewContact').
   * @return List<QuickAction.DescribeQuickActionResult>
   */
  public static List<QuickAction.DescribeQuickActionResult> describeQuickActions(List<String> sObjectNames) {}

  /**
   * Performs the quick action specified in the quick action request and returns the action result.
   * @param quickActionRequest 
   * @return QuickAction.QuickActionResult
   */
  public static QuickAction.QuickActionResult performQuickAction(QuickAction.QuickActionRequest quickActionRequest) {}

  /**
   * Performs the quick action specified in the quick action request and returns the action result.
   * @param quickActionRequest 
   * @param allOrNothing 
   * @return QuickAction.QuickActionResult
   */
  public static QuickAction.QuickActionResult performQuickAction(QuickAction.QuickActionRequest quickActionRequest, Boolean allOrNothing) {}

  /**
   * Performs the quick actions specified in the quick action request list and returns action results.
   * @param quickActionRequests 
   * @return List<QuickAction.QuickActionResult>
   */
  public static List<QuickAction.QuickActionResult> performQuickActions(List<QuickAction.QuickActionRequest> quickActionRequests) {}

  /**
   * Performs the quick actions specified in the quick action request list and returns action results.
   * @param quickActionRequests 
   * @param allOrNothing 
   * @return List<QuickAction.QuickActionResult>
   */
  public static List<QuickAction.QuickActionResult> performQuickActions(List<QuickAction.QuickActionRequest> quickActionRequests, Boolean allOrNothing) {}

}