global class SharedChannelInviteApprovedEvent extends Slack.Event {
    global Object SharedChannelInviteApprovedEvent() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getApprovingTeamId() { return null; }

    global Slack.ConnectUser getApprovingUser() { return null; }

    global Slack.ConnectChannel getChannel() { return null; }

    global String getEventTs() { return null; }

    global Slack.ConnectInviteDetail getInvite() { return null; }

    global virtual String getSubtype() { return null; }

    global List getTeamsInChannel() { return null; }

    global override String getType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setApprovingTeamId(String approvingTeamId) { }

    global void setApprovingUser(Slack.ConnectUser approvingUser) { }

    global void setChannel(Slack.ConnectChannel channel) { }

    global void setEventTs(String eventTs) { }

    global void setInvite(Slack.ConnectInviteDetail invite) { }

    global void setTeamsInChannel(List teamsInChannel) { }

    global override String toString() { return null; }
}