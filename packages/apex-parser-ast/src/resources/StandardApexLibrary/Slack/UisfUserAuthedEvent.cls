global class UisfUserAuthedEvent extends Slack.Event {
    global UisfUserAuthedEvent() { }

    global virtual Boolean equals(Object o) { return false; }

    global String getEventTs() { return null; }

    global override String getSubtype() { return null; }

    global List getTokenScopes() { return null; }

    global override String getType() { return null; }

    global String getUser() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setEventTs(String eventTs) { }

    global void setTokenScopes(List tokenInfo) { }

    global void setUser(String user) { }

    global override virtual String toString() { return null; }
}