global class ChannelUnsharedEvent extends Slack.Event {
    global ChannelUnsharedEvent() { }

    global virtual Boolean equals(Object o) { return false; }

    global String getChannel() { return null; }

    global String getEventTs() { return null; }

    global String getPreviouslyConnectedTeamId() { return null; }

    global virtual String getSubtype() { return null; }

    global override String getType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isExtShared() { return false; }

    global void setChannel(String channel) { }

    global void setEventTs(String eventTs) { }

    global void setExtShared(Boolean isExtShared) { }

    global void setPreviouslyConnectedTeamId(String previouslyConnectedTeamId) { }

    global override String toString() { return null; }
}