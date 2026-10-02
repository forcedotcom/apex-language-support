/**
 * Use Apex to request and process actions on objects that allow custom fields, on objects that appear in a Chatter feed, or on objects that are available globally.
 * <p>Example
 * In this sample, the trigger determines if the new contacts to be inserted are created by a quick action. If so, it sets the WhereFrom__c custom field to a value that depends on whether the quick action is global or local to the contact. Otherwise, if the inserted contacts don’t originate from a quick action, the WhereFrom__c field is set to 'NoAction'.
 * trigger accTrig2 on Contact (before insert) {
 *     for (Contact c : Trigger.new) {
 *         if (c.getQuickActionName() == QuickAction.CreateContact) {
 *             c.WhereFrom__c = 'GlobaActionl';
 *         } else if (c.getQuickActionName() == Schema.Account.QuickAction.CreateContact) {
 *             c.WhereFrom__c = 'AccountAction';
 *         } else if (c.getQuickActionName() == null) {
 *             c.WhereFrom__c = 'NoAction';
 *         } else {
 *             System.assert(false);
 *         }
 *     }
 * }
 * This sample performs a global action—QuickAction.CreateContact–on the passed-in contact object.
 * public Id globalCreate(Contact c) {
 *     QuickAction.QuickActionRequest req = new QuickAction.QuickActionRequest();
 *     req.quickActionName = QuickAction.CreateContact;
 *     req.record = c;
 *     QuickAction.QuickActionResult res = QuickAction.performQuickAction(req);
 *     return c.id;
 * }
 */
global class QuickAction {
    /**
     * Returns metadata information for the available quick actions of the provided parent object.
     * <p>Example
     * // Called for Account entity.
     * List<QuickAction.DescribeAvailableQuickActionResult> result1 =
     *     QuickAction.DescribeAvailableQuickActions('Account');
     *
     * // Called at global level, not entity level.
     * List<QuickAction.DescribeAvailableQuickActionResult> result2 =
     *     QuickAction.DescribeAvailableQuickActions('Global');
     * @return The metadata information for the available quick actions of the parent object.
     */
    global static List describeAvailableQuickActions(String parentType) { return null; }

    /**
     * Returns the metadata information for the provided quick actions.
     * <p>Example
     * // First 3 parameter values are for actions at the entity level.
     * // Last parameter is for an action at the global level.
     * List<QuickAction.DescribeQuickActionResult> result =
     *     QuickAction.DescribeQuickActions(new List<String> {
     *         'Account.QuickCreateContact', 'Opportunity.Update1',
     *         'Contact.Create1', 'Global.CreateNewContact' });
     * @return The metadata information for the provided quick actions.
     */
    global static List describeQuickActions(List actions) { return null; }

    /**
     * Performs the quick action specified in the quick action request and returns the action result.
     */
    global static QuickAction.QuickActionResult performQuickAction(QuickAction.QuickActionRequest performQuickAction) { return null; }

    /**
     * Performs the quick action specified in the quick action request with the option for partial success, and returns the result.
     */
    global static QuickAction.QuickActionResult performQuickAction(QuickAction.QuickActionRequest performQuickAction, Boolean allOrNothing) { return null; }

    /**
     * Performs the quick actions specified in the quick action request list and returns action results.
     */
    global static List performQuickActions(List performQuickActions) { return null; }

    /**
     * Performs the quick actions specified in the quick action request list with the option for partial success, and returns action results.
     */
    global static List performQuickActions(List performQuickActions, Boolean allOrNothing) { return null; }

    global static QuickAction.QuickActionTemplateResult retrieveQuickActionTemplate(String quickActionName, Id contextId) { return null; }

    global static List retrieveQuickActionTemplates(List quickActionNames, Id contextId) { return null; }
}