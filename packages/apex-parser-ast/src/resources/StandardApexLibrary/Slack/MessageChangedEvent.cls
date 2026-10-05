global class MessageChangedEvent extends Slack.Event {
    global MessageChangedEvent() { }

    global virtual Boolean equals(Object o) { return false; }

    global String getChannel() { return null; }

    global String getChannelType() { return null; }

    global String getEventTs() { return null; }

    global Slack.MessageChangedEvent.Message getMessage() { return null; }

    global Slack.MessageChangedEvent.PreviousMessage getPreviousMessage() { return null; }

    global override String getSubtype() { return null; }

    global String getTs() { return null; }

    global override String getType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isHidden() { return false; }

    global void setChannel(String channel) { }

    global void setChannelType(String channelType) { }

    global void setEventTs(String eventTs) { }

    global void setHidden(Boolean hidden) { }

    global void setMessage(Slack.MessageChangedEvent.Message message) { }

    global void setPreviousMessage(Slack.MessageChangedEvent.PreviousMessage previousMessage) { }

    global void setTs(String ts) { }

    global override String toString() { return null; }

    global class Edited {
        global Edited() { }

        global Slack.MessageChangedEvent.Edited clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getTs() { return null; }

        global String getUser() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setTs(String ts) { }

        global void setUser(String user) { }

        global override virtual String toString() { return null; }
    }

    global class Message {
        global Message() { }

        global Slack.MessageChangedEvent.Message clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getBotId() { return null; }

        global Slack.BotProfile getBotProfile() { return null; }

        global String getClientMsgId() { return null; }

        global Boolean getDisplayAsBot() { return false; }

        global List getFiles() { return null; }

        global Boolean getHidden() { return false; }

        global Boolean getIsLocked() { return false; }

        global String getLastRead() { return null; }

        global String getLatestReply() { return null; }

        global String getParentUserId() { return null; }

        global List getPinnedTo() { return null; }

        global List getReactions() { return null; }

        global Integer getReplyCount() { return 0; }

        global List getReplyUsers() { return null; }

        global Integer getReplyUsersCount() { return 0; }

        global String getSourceTeam() { return null; }

        global Boolean getSubscribed() { return false; }

        global String getSubtype() { return null; }

        global String getTeam() { return null; }

        global String getText() { return null; }

        global String getThreadTs() { return null; }

        global String getTs() { return null; }

        global String getType() { return null; }

        global Boolean getUpload() { return false; }

        global String getUser() { return null; }

        global String getUserTeam() { return null; }

        global List getXFiles() { return null; }

        global virtual Integer hashCode() { return 0; }

        global Boolean isStarred() { return false; }

        global void setBotId(String botId) { }

        global void setBotProfile(Slack.BotProfile botProfile) { }

        global void setClientMsgId(String clientMsgId) { }

        global void setDisplayAsBot(Boolean displayAsBot) { }

        global void setFiles(List files) { }

        global void setHidden(Boolean hidden) { }

        global void setIsLocked(Boolean isLocked) { }

        global void setLastRead(String lastRead) { }

        global void setLatestReply(String latestReply) { }

        global void setParentUserId(String parentUserId) { }

        global void setPinnedTo(List pinnedTo) { }

        global void setReactions(List reactions) { }

        global void setReplyCount(Integer replyCount) { }

        global void setReplyUsers(List replyUsers) { }

        global void setReplyUsersCount(Integer replyUsersCount) { }

        global void setSourceTeam(String sourceTeam) { }

        global void setStarred(Boolean starred) { }

        global void setSubscribed(Boolean subscribed) { }

        global void setSubtype(String subtype) { }

        global void setTeam(String team) { }

        global void setText(String text) { }

        global void setThreadTs(String threadTs) { }

        global void setTs(String ts) { }

        global void setUpload(Boolean upload) { }

        global void setUser(String user) { }

        global void setUserTeam(String userTeam) { }

        global void setXFiles(List xFiles) { }

        global override virtual String toString() { return null; }
    }

    global class PreviousMessage {
        global PreviousMessage() { }

        global Slack.MessageChangedEvent.PreviousMessage clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Slack.MessageChangedEvent.Message getMessage() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setMessage(Slack.MessageChangedEvent.Message message) { }

        global override virtual String toString() { return null; }
    }
}