global class UserResourceDeniedEvent extends Slack.Event {
    global Object UserResourceDeniedEvent() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global List getScopes() { return null; }

    global virtual String getSubtype() { return null; }

    global String getTriggerId() { return null; }

    global override String getType() { return null; }

    global String getUser() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setScopes(List scopes) { }

    global void setTriggerId(String triggerId) { }

    global void setUser(String user) { }

    global override String toString() { return null; }
}