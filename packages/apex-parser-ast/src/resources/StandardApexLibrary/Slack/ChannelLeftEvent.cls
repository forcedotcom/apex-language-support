global class ChannelLeftEvent extends Slack.Event {
    global Object ChannelLeftEvent() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getActorId() { return null; }

    global String getChannel() { return null; }

    global String getEventTs() { return null; }

    global virtual String getSubtype() { return null; }

    global override String getType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setActorId(String actorId) { }

    global void setChannel(String channel) { }

    global void setEventTs(String eventTs) { }

    global override String toString() { return null; }
}