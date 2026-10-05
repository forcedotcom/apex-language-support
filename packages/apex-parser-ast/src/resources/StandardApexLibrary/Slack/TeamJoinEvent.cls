global class TeamJoinEvent extends Slack.Event {
    global TeamJoinEvent() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual String getSubtype() { return null; }

    global override String getType() { return null; }

    global Slack.User getUser() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setUser(Slack.User user) { }

    global override String toString() { return null; }
}