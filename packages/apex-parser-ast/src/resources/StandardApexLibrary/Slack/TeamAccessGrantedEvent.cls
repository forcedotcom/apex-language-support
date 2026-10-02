global class TeamAccessGrantedEvent extends Slack.Event {
    global Object TeamAccessGrantedEvent() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getEventTs() { return null; }

    global virtual String getSubtype() { return null; }

    global List getTeamIds() { return null; }

    global override String getType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setEventTs(String eventTs) { }

    global void setTeamIds(List teamIds) { }

    global override String toString() { return null; }
}