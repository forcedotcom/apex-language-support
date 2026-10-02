global class ConversationsOpenResponse {
    global Object ConversationsOpenResponse() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global Slack.Conversation getChannel() { return null; }

    global String getError() { return null; }

    global Map getHttpResponseHeaders() { return null; }

    global String getNeeded() { return null; }

    global String getProvided() { return null; }

    global String getWarning() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isAlreadyOpen() { return false; }

    global Boolean isNoOp() { return false; }

    global Boolean isOk() { return false; }

    global void setAlreadyOpen(Boolean alreadyOpen) { }

    global void setChannel(Slack.Conversation channel) { }

    global void setError(String error) { }

    global void setHttpResponseHeaders(Map httpResponseHeaders) { }

    global void setNeeded(String needed) { }

    global void setNoOp(Boolean noOp) { }

    global void setOk(Boolean ok) { }

    global void setProvided(String provided) { }

    global void setWarning(String warning) { }

    global override String toString() { return null; }
}