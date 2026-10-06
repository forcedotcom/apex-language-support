global class StarAddedEvent extends Slack.Event {
    global StarAddedEvent() { }

    global virtual Boolean equals(Object o) { return false; }

    global String getEventTs() { return null; }

    global Slack.StarAddedEvent.Item getItem() { return null; }

    global virtual String getSubtype() { return null; }

    global override String getType() { return null; }

    global String getUser() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setEventTs(String eventTs) { }

    global void setItem(Slack.StarAddedEvent.Item item) { }

    global void setUser(String user) { }

    global override String toString() { return null; }

    global class Edited {
        global Edited() { }

        global Slack.StarAddedEvent.Edited clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getTs() { return null; }

        global String getUser() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setTs(String ts) { }

        global void setUser(String user) { }

        global override virtual String toString() { return null; }
    }

    global class Item {
        global Item() { }

        global Slack.StarAddedEvent.Item clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getChannel() { return null; }

        global Slack.FileComment getComment() { return null; }

        global String getCreatedBy() { return null; }

        global Long getDateCreate() { return 0L; }

        global Slack.File getFile() { return null; }

        global Slack.StarAddedEvent.Message getMessage() { return null; }

        global String getType() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setChannel(String channel) { }

        global void setComment(Slack.FileComment comment) { }

        global void setCreatedBy(String createdBy) { }

        global void setDateCreate(Long dateCreate) { }

        global void setFile(Slack.File file) { }

        global void setMessage(Slack.StarAddedEvent.Message message) { }

        global void setType(String type) { }

        global override virtual String toString() { return null; }
    }

    global class Message {
        global Message() { }

        global Slack.StarAddedEvent.Message clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getAppId() { return null; }

        global String getBotId() { return null; }

        global Slack.BotProfile getBotProfile() { return null; }

        global String getClientMsgId() { return null; }

        global Slack.StarAddedEvent.Edited getEdited() { return null; }

        global String getPermalink() { return null; }

        global List getPinnedTo() { return null; }

        global String getTeam() { return null; }

        global String getText() { return null; }

        global String getTs() { return null; }

        global String getType() { return null; }

        global String getUser() { return null; }

        global virtual Integer hashCode() { return 0; }

        global Boolean isStarred() { return false; }

        global void setAppId(String appId) { }

        global void setBotId(String botId) { }

        global void setBotProfile(Slack.BotProfile botProfile) { }

        global void setClientMsgId(String clientMsgId) { }

        global void setEdited(Slack.StarAddedEvent.Edited edited) { }

        global void setPermalink(String permalink) { }

        global void setPinnedTo(List pinnedTo) { }

        global void setStarred(Boolean isStarred) { }

        global void setTeam(String team) { }

        global void setText(String text) { }

        global void setTs(String ts) { }

        global void setType(String type) { }

        global void setUser(String user) { }

        global override virtual String toString() { return null; }
    }
}