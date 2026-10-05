/**
 * Contains validation errors that occur when the user saves the page that uses a standard controller.
 * <p>Usage
 * When using a standard controller, all validation errors, both custom and standard, that occur when the user saves the page are automatically added to the page error collections. If an inputField component is bound to the field with an error, the message is added to the component’s error collection. All messages are added to the page’s error collection. For more information, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.pages.meta/pages/pages_controller_std.htm#validation_rules_and_standard_controllers" target="_blank" title="HTML (New Window)">Validation Rules and Standard Controllers</a> in the Visualforce Developer's Guide.
 * If your application uses a custom controller or extension, you must use the message class for collecting errors.
 * <p>Instantiation
 * In a custom controller or controller extension, you can instantiate a Message in one of these ways:
 * ApexPages.Message myMsg = new ApexPages.Message(ApexPages.severity, summary);
 * where ApexPages.severity is the enum that determines how severe a message is, and summary is the String used to summarize the message. For example:
 * ApexPages.Message myMsg = new ApexPages.Message(ApexPages.Severity.FATAL, 'my error msg');
 * ApexPages.Message myMsg = new ApexPages.Message(ApexPages.severity, summary, detail);
 * where ApexPages. severity is the enum that determines how severe a message is, summary is the String used to summarize the message, and detail is the String used to provide more detailed information about the error.
 * <p>ApexPages.Severity Enum
 */
global class Message {
    /**
     * Creates a new instance of the ApexPages.Message class using the specified message severity and summary.
     */
    global Message(ApexPages.Severity severity, String message) { }

    /**
     * Creates a new instance of the ApexPages.Message class using the specified message severity, summary, and message detail.
     */
    global Message(ApexPages.Severity severity, String summary, String detail) { }

    /**
     * Creates a new instance of the ApexPages.Message class using the specified severity, summary, detail, and component ID.
     */
    global Message(ApexPages.Severity severity, String summary, String detail, String id) { }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the label of the associated inputField component. If no label is defined, this method returns null.
     */
    global String getComponentLabel() { return null; }

    /**
     * Returns the value of the detail parameter used to create the message. If no detail String was specified, this method returns null.
     */
    global String getDetail() { return null; }

    /**
     * Returns the severity enum used to create the message.
     */
    global ApexPages.Severity getSeverity() { return null; }

    /**
     * Returns the summary String used to create the message.
     */
    global String getSummary() { return null; }

    global Integer hashCode() { return 0; }

    global String toString() { return null; }
}