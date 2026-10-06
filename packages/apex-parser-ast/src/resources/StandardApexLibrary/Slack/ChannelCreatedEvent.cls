global class ChannelCreatedEvent extends Slack.Event {
    global ChannelCreatedEvent() { }

    global virtual Boolean equals(Object o) { return false; }

    global Slack.ChannelCreatedEvent.Channel getChannel() { return null; }

    global String getEventTs() { return null; }

    global virtual String getSubtype() { return null; }

    global override String getType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setChannel(Slack.ChannelCreatedEvent.Channel channel) { }

    global void setEventTs(String eventTs) { }

    global override String toString() { return null; }

    global class Channel {
        global Channel() { }

        global Slack.ChannelCreatedEvent.Channel clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getContextTeamId() { return null; }

        global Integer getCreated() { return 0; }

        global String getCreator() { return null; }

        global String getId() { return null; }

        global String getName() { return null; }

        global String getNameNormalized() { return null; }

        global virtual Integer hashCode() { return 0; }

        global Boolean isChannel() { return false; }

        global Boolean isOrgShared() { return false; }

        global Boolean isShared() { return false; }

        global void setChannel(Boolean isChannel) { }

        global void setContextTeamId(String contextTeamId) { }

        global void setCreated(Integer created) { }

        global void setCreator(String creator) { }

        global void setId(String id) { }

        global void setName(String name) { }

        global void setNameNormalized(String nameNormalized) { }

        global void setOrgShared(Boolean isOrgShared) { }

        global void setShared(Boolean isShared) { }

        global override virtual String toString() { return null; }
    }
}