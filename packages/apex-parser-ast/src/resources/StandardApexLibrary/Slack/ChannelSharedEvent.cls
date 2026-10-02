global class ChannelSharedEvent extends Slack.Event {
    global Object ChannelSharedEvent() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getChannel() { return null; }

    global String getConnectedTeamId() { return null; }

    global String getEventTs() { return null; }

    global virtual String getSubtype() { return null; }

    global override String getType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setChannel(String channel) { }

    global void setConnectedTeamId(String connectedTeamId) { }

    global void setEventTs(String eventTs) { }

    global override String toString() { return null; }
}