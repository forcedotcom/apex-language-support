global class ChatScheduleMessageResponse {
    global Object ChatScheduleMessageResponse() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getChannel() { return null; }

    global String getError() { return null; }

    global Map getHttpResponseHeaders() { return null; }

    global Slack.ChatScheduleMessageResponse.ScheduledMessage getMessage() { return null; }

    global String getNeeded() { return null; }

    global Integer getPostAt() { return 0; }

    global String getProvided() { return null; }

    global Slack.ErrorResponseMetadata getResponseMetadata() { return null; }

    global String getScheduledMessageId() { return null; }

    global String getWarning() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isOk() { return false; }

    global void setChannel(String channel) { }

    global void setError(String error) { }

    global void setHttpResponseHeaders(Map httpResponseHeaders) { }

    global void setMessage(Slack.ChatScheduleMessageResponse.ScheduledMessage message) { }

    global void setNeeded(String needed) { }

    global void setOk(Boolean ok) { }

    global void setPostAt(Integer postAt) { }

    global void setProvided(String provided) { }

    global void setResponseMetadata(Slack.ErrorResponseMetadata responseMetadata) { }

    global void setScheduledMessageId(String scheduledMessageId) { }

    global void setWarning(String warning) { }

    global override String toString() { return null; }

    global class ScheduledMessage {
        global Object ScheduledMessage() { return null; }

        global Slack.ChatScheduleMessageResponse.ScheduledMessage clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getAppId() { return null; }

        global String getBotId() { return null; }

        global Slack.BotProfile getBotProfile() { return null; }

        global String getTeam() { return null; }

        global String getText() { return null; }

        global String getType() { return null; }

        global String getUser() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setAppId(String appId) { }

        global void setBotId(String botId) { }

        global void setBotProfile(Slack.BotProfile botProfile) { }

        global void setTeam(String team) { }

        global void setText(String text) { }

        global void setType(String type) { }

        global void setUser(String user) { }

        global override virtual String toString() { return null; }
    }
}