global class AppRateLimitedEvent extends Slack.Event {
    global Object AppRateLimitedEvent() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getApiAppId() { return null; }

    global Integer getMinuteRateLimited() { return 0; }

    global virtual String getSubtype() { return null; }

    global String getTeamId() { return null; }

    global override String getType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setApiAppId(String apiAppId) { }

    global void setMinuteRateLimited(Integer minuteRateLimited) { }

    global void setTeamId(String teamId) { }

    global override String toString() { return null; }
}