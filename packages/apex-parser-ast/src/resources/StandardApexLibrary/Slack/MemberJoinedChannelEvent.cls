global class MemberJoinedChannelEvent extends Slack.Event {
    global Object MemberJoinedChannelEvent() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getChannel() { return null; }

    global String getChannelType() { return null; }

    global String getEventTs() { return null; }

    global String getInviter() { return null; }

    global virtual String getSubtype() { return null; }

    global String getTeam() { return null; }

    global override String getType() { return null; }

    global String getUser() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setChannel(String channel) { }

    global void setChannelType(String channelType) { }

    global void setEventTs(String eventTs) { }

    global void setInviter(String inviter) { }

    global void setTeam(String team) { }

    global void setUser(String user) { }

    global override String toString() { return null; }
}