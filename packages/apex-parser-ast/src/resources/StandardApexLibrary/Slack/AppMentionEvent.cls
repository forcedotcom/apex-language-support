global class AppMentionEvent extends Slack.Event {
    global AppMentionEvent() { }

    global virtual Boolean equals(Object o) { return false; }

    global String getBotId() { return null; }

    global Slack.BotProfile getBotProfile() { return null; }

    global String getChannel() { return null; }

    global String getClientMsgId() { return null; }

    global Slack.AppMentionEvent.Edited getEdited() { return null; }

    global String getEventTs() { return null; }

    global override String getSubtype() { return null; }

    global String getTeam() { return null; }

    global String getText() { return null; }

    global String getThreadTs() { return null; }

    global String getTs() { return null; }

    global override String getType() { return null; }

    global String getUser() { return null; }

    global String getUsername() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setBotId(String botId) { }

    global void setBotProfile(Slack.BotProfile botProfile) { }

    global void setChannel(String channel) { }

    global void setClientMsgId(String clientMsgId) { }

    global void setEdited(Slack.AppMentionEvent.Edited edited) { }

    global void setEventTs(String eventTs) { }

    global void setSubtype(String subtype) { }

    global void setTeam(String team) { }

    global void setText(String text) { }

    global void setThreadTs(String threadTs) { }

    global void setTs(String ts) { }

    global void setUser(String user) { }

    global void setUsername(String username) { }

    global override String toString() { return null; }

    global class Edited {
        global Edited() { }

        global Slack.AppMentionEvent.Edited clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getTs() { return null; }

        global String getUser() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setTs(String ts) { }

        global void setUser(String user) { }

        global override virtual String toString() { return null; }
    }
}