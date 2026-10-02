global class BotsInfoResponse {
    global Object BotsInfoResponse() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global Slack.BotsInfoResponse.Bot getBot() { return null; }

    global String getError() { return null; }

    global Map getHttpResponseHeaders() { return null; }

    global String getNeeded() { return null; }

    global String getProvided() { return null; }

    global String getWarning() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isOk() { return false; }

    global void setBot(Slack.BotsInfoResponse.Bot bot) { }

    global void setError(String error) { }

    global void setHttpResponseHeaders(Map httpResponseHeaders) { }

    global void setNeeded(String needed) { }

    global void setOk(Boolean ok) { }

    global void setProvided(String provided) { }

    global void setWarning(String warning) { }

    global override String toString() { return null; }

    global class Bot {
        global Object Bot() { return null; }

        global Slack.BotsInfoResponse.Bot clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getAppId() { return null; }

        global Slack.BotIcons getIcons() { return null; }

        global String getId() { return null; }

        global String getName() { return null; }

        global Integer getUpdated() { return 0; }

        global String getUserId() { return null; }

        global virtual Integer hashCode() { return 0; }

        global Boolean isDeleted() { return false; }

        global void setAppId(String appId) { }

        global void setDeleted(Boolean deleted) { }

        global void setIcons(Slack.BotIcons icons) { }

        global void setId(String id) { }

        global void setName(String name) { }

        global void setUpdated(Integer updated) { }

        global void setUserId(String userId) { }

        global override virtual String toString() { return null; }
    }
}