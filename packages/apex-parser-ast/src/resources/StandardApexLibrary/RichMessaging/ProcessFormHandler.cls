/**
 * Apex interface that processes the responses to forms submitted in a messaging session.
 */
global interface ProcessFormHandler {
    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    /**
     * Processes the form request and returns the ID of the record created during form processing.
     * ProcessFormHandler Example Implementation
     * The sample ContactApexFormHandler Apex class automatically captures the customer's submitted details, creates a Contact record in Salesforce, and returns the Contact record ID.
     * This is an example implementation of the RichMessaging.ProcessFormHandler interface.
     * global class ContactApexFormHandler implements Richmessaging.ProcessFormHandler{
     *     global ID
     *     processFormRequest(RichMessaging.ProcessFormResponse formResponse) {
     *         // Create a new Contact object
     *             Contact newContact = new Contact(
     *             Phone = formResponse.formValues.get('Phone'),
     *             Salutation = formResponse.formValues.get('Salutation'),
     *             Email = formResponse.formValues.get('Email')
     *             );
     *     // Insert the new contact into the database
     *     insert newContact;
     *      // Return the ID of the newly created contact
     *      return newContact.Id;
     * For more information, see "Create a Form Based on an Apex Class" in <a class="xref" href="https://help.salesforce.com/s/articleView?id=service.messaging_components_forms.htm&amp;language=en_US" target="_blank">this help topic</a>.
     * @return ID: Type: RichMessaging.ProcessFormResponse
     */
    abstract Id processFormRequest(RichMessaging.ProcessFormResponse formResponse);

    virtual String toString();
}