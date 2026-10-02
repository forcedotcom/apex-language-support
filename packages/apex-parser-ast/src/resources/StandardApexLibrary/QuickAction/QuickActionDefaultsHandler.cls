/**
 * The QuickAction.QuickActionDefaultsHandler interface lets you specify the default values for the standard Email and Send Email actions in the case feed. You can use this interface to specify the From address, CC address, BCC address, subject, and email body for the Email action in the case feed. You can use the interface to pre-populate these fields based on the context where the action is displayed, such as the case origin (for example, country) and subject.
 * <p>Usage
 * To specify default values for the standard Email action in the case feed, create a class that implements QuickAction.QuickActionDefaultsHandler.
 * The QuickAction.QuickActionDefaultsHandler interface works in Salesforce Classic and Lightning Experience.
 * When working in Lightning Experience, keep the following things in mind:
 * The interface overrides email values set up with predefined IDs.
 * The interface works with the out-of-the-box Email action provided on cases. You can also use the interface with custom Email actions for the case object.
 * The interface in Lightning Experience doesn’t support:
 * Email attachments
 * Custom email fields
 * Visualforce email templates, which are a type of email template available in Salesforce Classic
 * The From field determines the from address picklist. While you can’t customize this picklist in Send Email action types via the QuickActionDefaultsHandler interface, you can customize the From Address field. To customize this field, remove the From field from the SendEmail quick action layout and add the From Address field instead. Then provide a valid and verified from address in the QuickActionDefaultsHandler code. This address must be the current user’s address, an organization-wide email address that the current user has access to, or an Email-to-Case routing address.
 * If your Apex interface adds content to the email body, merge fields display as unresolved. During preview and send, the merge fields resolve.
 * When you implement this interface, provide an empty parameterless constructor.
 */
global interface QuickActionDefaultsHandler {
    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    /**
     * Implement this method to provide default values for the standard Email action in the case feed.
     */
    abstract void onInitDefaults(List defaults);

    virtual String toString();
}