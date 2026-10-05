global class MessageEkmAccessDeniedEvent extends Slack.Event {
    global MessageEkmAccessDeniedEvent() { }

    global virtual Boolean equals(Object o) { return false; }

    global String getChannel() { return null; }

    global String getChannelType() { return null; }

    global String getEventTs() { return null; }

    global override String getSubtype() { return null; }

    global String getText() { return null; }

    global String getTs() { return null; }

    global override String getType() { return null; }

    global String getUser() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isHidden() { return false; }

    global void setChannel(String channel) { }

    global void setChannelType(String channelType) { }

    global void setEventTs(String eventTs) { }

    global void setHidden(Boolean hidden) { }

    global void setText(String text) { }

    global void setTs(String ts) { }

    global void setUser(String user) { }

    global override String toString() { return null; }
}