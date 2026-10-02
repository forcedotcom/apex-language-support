global class PinsListResponse {
    global Object PinsListResponse() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getError() { return null; }

    global Map getHttpResponseHeaders() { return null; }

    global List getItems() { return null; }

    global String getNeeded() { return null; }

    global String getProvided() { return null; }

    global String getWarning() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isOk() { return false; }

    global void setError(String error) { }

    global void setHttpResponseHeaders(Map httpResponseHeaders) { }

    global void setItems(List items) { }

    global void setNeeded(String needed) { }

    global void setOk(Boolean ok) { }

    global void setProvided(String provided) { }

    global void setWarning(String warning) { }

    global override String toString() { return null; }

    global class MessageItem {
        global Object MessageItem() { return null; }

        global Slack.PinsListResponse.MessageItem clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getChannel() { return null; }

        global String getComment() { return null; }

        global Integer getCreated() { return 0; }

        global String getCreatedBy() { return null; }

        global Slack.File getFile() { return null; }

        global Slack.Message getMessage() { return null; }

        global String getType() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setChannel(String channel) { }

        global void setComment(String comment) { }

        global void setCreated(Integer created) { }

        global void setCreatedBy(String createdBy) { }

        global void setFile(Slack.File file) { }

        global void setMessage(Slack.Message message) { }

        global void setType(String type) { }

        global override virtual String toString() { return null; }
    }
}