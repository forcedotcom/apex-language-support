global class MessageFileShareEvent extends Slack.Event {
    global Object MessageFileShareEvent() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getChannel() { return null; }

    global String getChannelType() { return null; }

    global Boolean getDisplayAsBot() { return false; }

    global String getEventTs() { return null; }

    global List getFiles() { return null; }

    global String getParentUserId() { return null; }

    global override String getSubtype() { return null; }

    global String getText() { return null; }

    global String getThreadTs() { return null; }

    global String getTs() { return null; }

    global override String getType() { return null; }

    global Boolean getUpload() { return false; }

    global String getUser() { return null; }

    global List getXFiles() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setChannel(String channel) { }

    global void setChannelType(String channelType) { }

    global void setDisplayAsBot(Boolean displayAsBot) { }

    global void setEventTs(String eventTs) { }

    global void setFiles(List files) { }

    global void setParentUserId(String parentUserId) { }

    global void setText(String text) { }

    global void setThreadTs(String threadTs) { }

    global void setTs(String ts) { }

    global void setUpload(Boolean upload) { }

    global void setUser(String user) { }

    global void setXFiles(List xFiles) { }

    global override String toString() { return null; }
}