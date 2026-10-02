global class SharedChannelInviteDeclinedEvent extends Slack.Event {
    global Object SharedChannelInviteDeclinedEvent() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global Slack.ConnectChannel getChannel() { return null; }

    global String getDecliningTeamId() { return null; }

    global Slack.ConnectUser getDecliningUser() { return null; }

    global String getEventTs() { return null; }

    global Slack.ConnectInviteDetail getInvite() { return null; }

    global virtual String getSubtype() { return null; }

    global List getTeamsInChannel() { return null; }

    global override String getType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setChannel(Slack.ConnectChannel channel) { }

    global void setDecliningTeamId(String decliningTeamId) { }

    global void setDecliningUser(Slack.ConnectUser decliningUser) { }

    global void setEventTs(String eventTs) { }

    global void setInvite(Slack.ConnectInviteDetail invite) { }

    global void setTeamsInChannel(List teamsInChannel) { }

    global override String toString() { return null; }
}