global class MessageChannelJoinEvent extends Slack.Event {
    global Object MessageChannelJoinEvent() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getChannel() { return null; }

    global String getChannelType() { return null; }

    global String getEventTs() { return null; }

    global String getInviter() { return null; }

    global override String getSubtype() { return null; }

    global String getTeam() { return null; }

    global String getText() { return null; }

    global String getTs() { return null; }

    global override String getType() { return null; }

    global String getUser() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setChannel(String channel) { }

    global void setChannelType(String channelType) { }

    global void setEventTs(String eventTs) { }

    global void setInviter(String inviter) { }

    global void setTeam(String team) { }

    global void setText(String text) { }

    global void setTs(String ts) { }

    global void setUser(String user) { }

    global override String toString() { return null; }
}