global class UserChangeEvent extends Slack.Event {
    global Object UserChangeEvent() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global Integer getCacheTs() { return 0; }

    global virtual String getSubtype() { return null; }

    global override String getType() { return null; }

    global Slack.User getUser() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setCacheTs(Integer cacheTs) { }

    global void setUser(Slack.User user) { }

    global override String toString() { return null; }
}