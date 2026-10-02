global class ChannelRenameEvent extends Slack.Event {
    global Object ChannelRenameEvent() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global Slack.ChannelRenameEvent.Channel getChannel() { return null; }

    global String getEventTs() { return null; }

    global virtual String getSubtype() { return null; }

    global override String getType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setChannel(Slack.ChannelRenameEvent.Channel channel) { }

    global void setEventTs(String eventTs) { }

    global override String toString() { return null; }

    global class Channel {
        global Object Channel() { return null; }

        global Slack.ChannelRenameEvent.Channel clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Integer getCreated() { return 0; }

        global String getId() { return null; }

        global String getName() { return null; }

        global String getNameNormalized() { return null; }

        global virtual Integer hashCode() { return 0; }

        global Boolean isChannel() { return false; }

        global Boolean isMpim() { return false; }

        global void setChannel(Boolean isChannel) { }

        global void setCreated(Integer created) { }

        global void setId(String id) { }

        global void setMpim(Boolean isMpim) { }

        global void setName(String name) { }

        global void setNameNormalized(String nameNormalized) { }

        global override virtual String toString() { return null; }
    }
}