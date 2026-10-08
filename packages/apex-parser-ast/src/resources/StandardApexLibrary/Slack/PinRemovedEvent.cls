global class PinRemovedEvent extends Slack.Event {
    global PinRemovedEvent() { }

    global virtual Boolean equals(Object o) { return false; }

    global String getChannelId() { return null; }

    global String getEventTs() { return null; }

    global Slack.PinRemovedEvent.Item getItem() { return null; }

    global String getItemUser() { return null; }

    global Integer getPinCount() { return 0; }

    global Slack.PinRemovedEvent.PinnedInfo getPinnedInfo() { return null; }

    global virtual String getSubtype() { return null; }

    global override String getType() { return null; }

    global String getUser() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isHasPins() { return false; }

    global void setChannelId(String channelId) { }

    global void setEventTs(String eventTs) { }

    global void setHasPins(Boolean hasPins) { }

    global void setItem(Slack.PinRemovedEvent.Item item) { }

    global void setItemUser(String itemUser) { }

    global void setPinCount(Integer pinCount) { }

    global void setPinnedInfo(Slack.PinRemovedEvent.PinnedInfo pinnedInfo) { }

    global void setUser(String user) { }

    global override String toString() { return null; }

    global class Item {
        global Item() { }

        global Slack.PinRemovedEvent.Item clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getChannel() { return null; }

        global Slack.FileComment getComment() { return null; }

        global Integer getCreated() { return 0; }

        global String getCreatedBy() { return null; }

        global Slack.File getFile() { return null; }

        global Slack.PinRemovedEvent.Message getMessage() { return null; }

        global String getType() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setChannel(String channel) { }

        global void setComment(Slack.FileComment comment) { }

        global void setCreated(Integer created) { }

        global void setCreatedBy(String createdBy) { }

        global void setFile(Slack.File file) { }

        global void setMessage(Slack.PinRemovedEvent.Message message) { }

        global void setType(String type) { }

        global override virtual String toString() { return null; }
    }

    global class Message {
        global Message() { }

        global Slack.PinRemovedEvent.Message clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getAppId() { return null; }

        global String getBotId() { return null; }

        global Slack.BotProfile getBotProfile() { return null; }

        global String getClientMsgId() { return null; }

        global String getPermalink() { return null; }

        global List getPinnedTo() { return null; }

        global String getTeam() { return null; }

        global String getText() { return null; }

        global String getTs() { return null; }

        global String getType() { return null; }

        global String getUser() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setAppId(String appId) { }

        global void setBotId(String botId) { }

        global void setBotProfile(Slack.BotProfile botProfile) { }

        global void setClientMsgId(String clientMsgId) { }

        global void setPermalink(String permalink) { }

        global void setPinnedTo(List pinnedTo) { }

        global void setTeam(String team) { }

        global void setText(String text) { }

        global void setTs(String ts) { }

        global void setType(String type) { }

        global void setUser(String user) { }

        global override virtual String toString() { return null; }
    }

    global class PinnedInfo {
        global PinnedInfo() { }

        global Slack.PinRemovedEvent.PinnedInfo clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getChannel() { return null; }

        global String getPinnedBy() { return null; }

        global Long getPinnedTs() { return 0L; }

        global virtual Integer hashCode() { return 0; }

        global void setChannel(String channel) { }

        global void setPinnedBy(String pinnedBy) { }

        global void setPinnedTs(Long pinnedTs) { }

        global override virtual String toString() { return null; }
    }
}