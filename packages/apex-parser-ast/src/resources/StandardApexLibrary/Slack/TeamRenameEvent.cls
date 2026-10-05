global class TeamRenameEvent extends Slack.Event {
    global TeamRenameEvent() { }

    global virtual Boolean equals(Object o) { return false; }

    global String getName() { return null; }

    global virtual String getSubtype() { return null; }

    global override String getType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setName(String name) { }

    global override String toString() { return null; }
}