global class ConversationsRepliesResponse {
    global ConversationsRepliesResponse() { }

    global virtual Boolean equals(Object o) { return false; }

    global String getError() { return null; }

    global Map getHttpResponseHeaders() { return null; }

    global List getMessages() { return null; }

    global String getNeeded() { return null; }

    global String getProvided() { return null; }

    global Slack.ResponseMetadata getResponseMetadata() { return null; }

    global String getWarning() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isHasMore() { return false; }

    global Boolean isOk() { return false; }

    global void setError(String error) { }

    global void setHasMore(Boolean hasMore) { }

    global void setHttpResponseHeaders(Map httpResponseHeaders) { }

    global void setMessages(List messages) { }

    global void setNeeded(String needed) { }

    global void setOk(Boolean ok) { }

    global void setProvided(String provided) { }

    global void setResponseMetadata(Slack.ResponseMetadata responseMetadata) { }

    global void setWarning(String warning) { }

    global override String toString() { return null; }
}