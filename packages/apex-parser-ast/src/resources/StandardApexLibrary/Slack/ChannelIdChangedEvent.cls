global class ChannelIdChangedEvent extends Slack.Event {
    global Object ChannelIdChangedEvent() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getEventTs() { return null; }

    global String getNewChannelId() { return null; }

    global String getOldChannelId() { return null; }

    global virtual String getSubtype() { return null; }

    global override String getType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setEventTs(String eventTs) { }

    global void setNewChannelId(String newChannelId) { }

    global void setOldChannelId(String oldChannelId) { }

    global override String toString() { return null; }
}