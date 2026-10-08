global class GroupOpenEvent extends Slack.Event {
    global GroupOpenEvent() { }

    global virtual Boolean equals(Object o) { return false; }

    global String getChannel() { return null; }

    global virtual String getSubtype() { return null; }

    global override String getType() { return null; }

    global String getUser() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setChannel(String channel) { }

    global void setUser(String user) { }

    global override String toString() { return null; }
}