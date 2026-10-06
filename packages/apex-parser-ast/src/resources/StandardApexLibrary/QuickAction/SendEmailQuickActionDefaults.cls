/**
 * Represents an Apex class that provides: the From address list; the original email’s email message ID, provided that the reply action was invoked on the email message feed item; and methods to specify related settings on templates. You can override these fields before the standard Email Action is rendered.
 * Usage
 * Note
 * You cannot instantiate this class. One can use the getters/setters when using it in the context of QuickAction.QuickActionDefaultsHandler.
 */
global class SendEmailQuickActionDefaults extends QuickAction.QuickActionDefaults {
    global virtual Boolean equals(Object o) { return false; }

    global String getActionName() { return null; }

    global String getActionType() { return null; }

    global Id getContextId() { return null; }

    /**
     * Returns a list of email addresses that are available in the From: address drop-down menu for the standard Email Action.
     */
    global List getFromAddressList() { return null; }

    /**
     * Returns the email message ID of the email to which the reply/reply all action has been invoked.
     */
    global Id getInReplyToId() { return null; }

    global SObject getTargetSObject() { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Specifies whether the template subject should be ignored (true), thus using the original subject, or whether the template subject should replace the original subject (false).
     */
    global void setIgnoreTemplateSubject(Boolean ignoreSubject) { }

    /**
     * Specifies whether the template body should be inserted above the original body content (true) or whether it should replace the entire content with the template body (false).
     */
    global void setInsertTemplateBody(Boolean insertBody) { }

    /**
     * Sets the email template ID to load into the email body.
     */
    global void setTemplateId(Id templateId) { }

    global override virtual String toString() { return null; }
}