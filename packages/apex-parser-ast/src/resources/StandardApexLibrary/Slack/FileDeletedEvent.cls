global class FileDeletedEvent extends Slack.Event {
    global Object FileDeletedEvent() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global List getChannelIds() { return null; }

    global String getEventTs() { return null; }

    global String getFileId() { return null; }

    global virtual String getSubtype() { return null; }

    global override String getType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setChannelIds(List channelIds) { }

    global void setEventTs(String eventTs) { }

    global void setFileId(String fileId) { }

    global override String toString() { return null; }
}