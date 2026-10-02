global class ChatPostMessageResponse {
    global Object ChatPostMessageResponse() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getChannel() { return null; }

    global String getDeprecatedArgument() { return null; }

    global String getError() { return null; }

    global List getErrors() { return null; }

    global Map getHttpResponseHeaders() { return null; }

    global Slack.Message getMessage() { return null; }

    global String getNeeded() { return null; }

    global String getProvided() { return null; }

    global Slack.ErrorResponseMetadata getResponseMetadata() { return null; }

    global String getTs() { return null; }

    global String getWarning() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isOk() { return false; }

    global void setChannel(String channel) { }

    global void setDeprecatedArgument(String deprecatedArgument) { }

    global void setError(String error) { }

    global void setErrors(List errors) { }

    global void setHttpResponseHeaders(Map httpResponseHeaders) { }

    global void setMessage(Slack.Message message) { }

    global void setNeeded(String needed) { }

    global void setOk(Boolean ok) { }

    global void setProvided(String provided) { }

    global void setResponseMetadata(Slack.ErrorResponseMetadata responseMetadata) { }

    global void setTs(String ts) { }

    global void setWarning(String warning) { }

    global override String toString() { return null; }
}