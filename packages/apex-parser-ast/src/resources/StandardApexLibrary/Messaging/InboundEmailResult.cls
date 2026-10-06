/**
 * The InboundEmailResult object is used to return the result of the email service. If this object is null, the result is assumed to be successful.
 */
global class InboundEmailResult {
    /**
     * A message that Salesforce returns in the body of a reply email. This field can be populated with text irrespective of the value returned by the Success field.
     * String
     */
    global webservice String message;
    /**
     * A value that indicates whether the email was successfully processed.
     * Usage
     * If false, Salesforce rejects the inbound email and sends a reply email to the original sender containing the message specified in the Message field.
     * Boolean
     */
    global webservice Boolean success;

    global InboundEmailResult() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}