global class SharedChannelInviteReceivedEvent extends Slack.Event {
    global Object SharedChannelInviteReceivedEvent() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global Slack.ConnectChannel getChannel() { return null; }

    global String getEventTs() { return null; }

    global Slack.ConnectInviteDetail getInvite() { return null; }

    global virtual String getSubtype() { return null; }

    global override String getType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setChannel(Slack.ConnectChannel channel) { }

    global void setEventTs(String eventTs) { }

    global void setInvite(Slack.ConnectInviteDetail invite) { }

    global override String toString() { return null; }
}