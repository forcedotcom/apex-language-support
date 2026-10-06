global class GroupRenameEvent extends Slack.Event {
    global GroupRenameEvent() { }

    global virtual Boolean equals(Object o) { return false; }

    global Slack.GroupRenameEvent.Channel getChannel() { return null; }

    global String getEventTs() { return null; }

    global virtual String getSubtype() { return null; }

    global override String getType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setChannel(Slack.GroupRenameEvent.Channel channel) { }

    global void setEventTs(String eventTs) { }

    global override String toString() { return null; }

    global class Channel {
        global Channel() { }

        global Slack.GroupRenameEvent.Channel clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Integer getCreated() { return 0; }

        global String getId() { return null; }

        global String getName() { return null; }

        global String getNameNormalized() { return null; }

        global virtual Integer hashCode() { return 0; }

        global Boolean isChannel() { return false; }

        global Boolean isGroup() { return false; }

        global Boolean isMpim() { return false; }

        global void setChannel(Boolean isChannel) { }

        global void setCreated(Integer created) { }

        global void setGroup(Boolean isGroup) { }

        global void setId(String id) { }

        global void setMpim(Boolean isMpim) { }

        global void setName(String name) { }

        global void setNameNormalized(String nameNormalized) { }

        global override virtual String toString() { return null; }
    }
}