/**
 * Represents an abstract Apex class that provides the context for running the standard Email Action on Case Feed and the container of the Email Message fields for the action payload. You can override the target fields before the standard Email Action is rendered.
 * Usage
 * Note
 * You cannot extend this abstract class. You can use the getter methods when using it in the context of QuickAction.QuickActionDefaultsHandler. Salesforce provides a class that extends this class (See QuickAction.SendEmailQuickActionDefaults.)
 */
global abstract class QuickActionDefaults {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the name of the standard Email Action on Case Feed (Case.Email).
     */
    global String getActionName() { return null; }

    /**
     * Returns the type of the standard Email Action on Case Feed (Email).
     */
    global String getActionType() { return null; }

    /**
     * The ID of the context related to the standard Email Action on Case Feed (Case ID).
     */
    global Id getContextId() { return null; }

    /**
     * The target object of the standard Email Action on Case Feed (EmailMessage).
     */
    global SObject getTargetSObject() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}