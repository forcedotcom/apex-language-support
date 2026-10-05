global class Latest {
    global Latest() { }

    global virtual Boolean equals(Object o) { return false; }

    global String getBotId() { return null; }

    global String getBotLink() { return null; }

    global Slack.BotProfile getBotProfile() { return null; }

    global String getClientMsgId() { return null; }

    global Slack.Latest.Edited getEdited() { return null; }

    global List getFiles() { return null; }

    global String getParentUserId() { return null; }

    global List getReactions() { return null; }

    global String getSubtype() { return null; }

    global String getTeam() { return null; }

    global String getText() { return null; }

    global String getThreadTs() { return null; }

    global String getTopic() { return null; }

    global String getTs() { return null; }

    global String getType() { return null; }

    global String getUser() { return null; }

    global String getUsername() { return null; }

    global List getXFiles() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isDisplayAsBot() { return false; }

    global Boolean isUpload() { return false; }

    global void setBotId(String botId) { }

    global void setBotLink(String botLink) { }

    global void setBotProfile(Slack.BotProfile botProfile) { }

    global void setClientMsgId(String clientMsgId) { }

    global void setDisplayAsBot(Boolean displayAsBot) { }

    global void setEdited(Slack.Latest.Edited edited) { }

    global void setFiles(List files) { }

    global void setParentUserId(String parentUserId) { }

    global void setReactions(List reactions) { }

    global void setSubtype(String subtype) { }

    global void setTeam(String team) { }

    global void setText(String text) { }

    global void setThreadTs(String threadTs) { }

    global void setTopic(String topic) { }

    global void setTs(String ts) { }

    global void setType(String type) { }

    global void setUpload(Boolean upload) { }

    global void setUser(String user) { }

    global void setUsername(String username) { }

    global void setXFiles(List xFiles) { }

    global override String toString() { return null; }

    global class Edited {
        global Edited() { }

        global Slack.Latest.Edited clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getTs() { return null; }

        global String getUser() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setTs(String ts) { }

        global void setUser(String user) { }

        global override virtual String toString() { return null; }
    }
}