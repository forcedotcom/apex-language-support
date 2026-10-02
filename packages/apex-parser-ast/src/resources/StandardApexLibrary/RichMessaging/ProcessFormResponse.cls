global class ProcessFormResponse {
    global String externalResourceName;
    global Map formValues;
    global String inReplyToMessageId;
    global Id messageSessionId;
    global Id messagingComponentId;

    global Object ProcessFormResponse(Map formValues, Id messageSessionId, Id messagingComponentId, String externalResourceName, String inReplyToMessageId) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}