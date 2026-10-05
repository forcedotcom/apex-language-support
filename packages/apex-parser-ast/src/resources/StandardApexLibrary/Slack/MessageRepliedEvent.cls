global class MessageRepliedEvent extends Slack.Event {
    global MessageRepliedEvent() { }

    global virtual Boolean equals(Object o) { return false; }

    global String getChannel() { return null; }

    global String getEventTs() { return null; }

    global Slack.MessageRepliedEvent.Message getMessage() { return null; }

    global override String getSubtype() { return null; }

    global String getTs() { return null; }

    global override String getType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isHidden() { return false; }

    global void setChannel(String channel) { }

    global void setEventTs(String eventTs) { }

    global void setHidden(Boolean hidden) { }

    global void setMessage(Slack.MessageRepliedEvent.Message message) { }

    global void setTs(String ts) { }

    global override String toString() { return null; }

    global class Edited {
        global Edited() { }

        global Slack.MessageRepliedEvent.Edited clone() { return null; }

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

        global Slack.MessageRepliedEvent.Message clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getClientMsgId() { return null; }

        global List getPinnedTo() { return null; }

        global List getReactions() { return null; }

        global String getSourceTeam() { return null; }

        global String getSubtype() { return null; }

        global String getTeam() { return null; }

        global String getText() { return null; }

        global String getTs() { return null; }

        global String getType() { return null; }

        global String getUser() { return null; }

        global String getUserTeam() { return null; }

        global virtual Integer hashCode() { return 0; }

        global Boolean isStarred() { return false; }

        global void setClientMsgId(String clientMsgId) { }

        global void setPinnedTo(List pinnedTo) { }

        global void setReactions(List reactions) { }

        global void setSourceTeam(String sourceTeam) { }

        global void setStarred(Boolean starred) { }

        global void setSubtype(String subtype) { }

        global void setTeam(String team) { }

        global void setText(String text) { }

        global void setTs(String ts) { }

        global void setUser(String user) { }

        global void setUserTeam(String userTeam) { }

        global override virtual String toString() { return null; }
    }
}