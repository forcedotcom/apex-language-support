global class ReactionsGetResponse {
    global ReactionsGetResponse() { }

    global virtual Boolean equals(Object o) { return false; }

    global String getChannel() { return null; }

    global String getError() { return null; }

    global Map getHttpResponseHeaders() { return null; }

    global Slack.ReactionsGetResponse.Message getMessage() { return null; }

    global String getNeeded() { return null; }

    global String getProvided() { return null; }

    global String getType() { return null; }

    global String getWarning() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isOk() { return false; }

    global void setChannel(String channel) { }

    global void setError(String error) { }

    global void setHttpResponseHeaders(Map httpResponseHeaders) { }

    global void setMessage(Slack.ReactionsGetResponse.Message message) { }

    global void setNeeded(String needed) { }

    global void setOk(Boolean ok) { }

    global void setProvided(String provided) { }

    global void setType(String type) { }

    global void setWarning(String warning) { }

    global override String toString() { return null; }

    global class Message {
        global Message() { }

        global Slack.ReactionsGetResponse.Message clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getAppId() { return null; }

        global String getBotId() { return null; }

        global Slack.BotProfile getBotProfile() { return null; }

        global String getPermalink() { return null; }

        global List getReactions() { return null; }

        global String getSubtype() { return null; }

        global String getTeam() { return null; }

        global String getText() { return null; }

        global String getTs() { return null; }

        global String getType() { return null; }

        global String getUser() { return null; }

        global String getUsername() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setAppId(String appId) { }

        global void setBotId(String botId) { }

        global void setBotProfile(Slack.BotProfile botProfile) { }

        global void setPermalink(String permalink) { }

        global void setReactions(List reactions) { }

        global void setSubtype(String subtype) { }

        global void setTeam(String team) { }

        global void setText(String text) { }

        global void setTs(String ts) { }

        global void setType(String type) { }

        global void setUser(String user) { }

        global void setUsername(String username) { }

        global override virtual String toString() { return null; }
    }
}