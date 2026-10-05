global class MessageMeEvent extends Slack.Event {
    global MessageMeEvent() { }

    global virtual Boolean equals(Object o) { return false; }

    global String getBotId() { return null; }

    global String getChannel() { return null; }

    global String getChannelType() { return null; }

    global String getEventTs() { return null; }

    global override String getSubtype() { return null; }

    global String getText() { return null; }

    global String getTs() { return null; }

    global override String getType() { return null; }

    global String getUsername() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setBotId(String botId) { }

    global void setChannel(String channel) { }

    global void setChannelType(String channelType) { }

    global void setEventTs(String eventTs) { }

    global void setText(String text) { }

    global void setTs(String ts) { }

    global void setUsername(String username) { }

    global override String toString() { return null; }
}