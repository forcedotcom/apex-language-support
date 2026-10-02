global class ChatScheduledMessagesListResponse {
    global Object ChatScheduledMessagesListResponse() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getError() { return null; }

    global Map getHttpResponseHeaders() { return null; }

    global String getNeeded() { return null; }

    global String getProvided() { return null; }

    global Slack.ResponseMetadata getResponseMetadata() { return null; }

    global List getScheduledMessages() { return null; }

    global String getWarning() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isOk() { return false; }

    global void setError(String error) { }

    global void setHttpResponseHeaders(Map httpResponseHeaders) { }

    global void setNeeded(String needed) { }

    global void setOk(Boolean ok) { }

    global void setProvided(String provided) { }

    global void setResponseMetadata(Slack.ResponseMetadata responseMetadata) { }

    global void setScheduledMessages(List scheduledMessages) { }

    global void setWarning(String warning) { }

    global override String toString() { return null; }

    global class ScheduledMessage {
        global Object ScheduledMessage() { return null; }

        global Slack.ChatScheduledMessagesListResponse.ScheduledMessage clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getChannelId() { return null; }

        global Integer getDateCreated() { return 0; }

        global String getId() { return null; }

        global Integer getPostAt() { return 0; }

        global String getText() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setChannelId(String channelId) { }

        global void setDateCreated(Integer dateCreated) { }

        global void setId(String id) { }

        global void setPostAt(Integer postAt) { }

        global void setText(String text) { }

        global override virtual String toString() { return null; }
    }
}