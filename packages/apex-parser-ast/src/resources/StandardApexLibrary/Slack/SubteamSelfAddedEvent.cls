global class SubteamSelfAddedEvent extends Slack.Event {
    global Object SubteamSelfAddedEvent() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getEventTs() { return null; }

    global String getSubteamId() { return null; }

    global virtual String getSubtype() { return null; }

    global override String getType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setEventTs(String eventTs) { }

    global void setSubteamId(String subteamId) { }

    global override String toString() { return null; }
}