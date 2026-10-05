global class SharedChannelInviteAcceptedEvent extends Slack.Event {
    global SharedChannelInviteAcceptedEvent() { }

    global virtual Boolean equals(Object o) { return false; }

    global Slack.ConnectUser getAcceptingUser() { return null; }

    global Slack.ConnectChannel getChannel() { return null; }

    global String getEventTs() { return null; }

    global Slack.ConnectInviteDetail getInvite() { return null; }

    global virtual String getSubtype() { return null; }

    global List getTeamsInChannel() { return null; }

    global override String getType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isApprovalRequired() { return false; }

    global void setAcceptingUser(Slack.ConnectUser acceptingUser) { }

    global void setApprovalRequired(Boolean approvalRequired) { }

    global void setChannel(Slack.ConnectChannel channel) { }

    global void setEventTs(String eventTs) { }

    global void setInvite(Slack.ConnectInviteDetail invite) { }

    global void setTeamsInChannel(List teamsInChannel) { }

    global override String toString() { return null; }
}