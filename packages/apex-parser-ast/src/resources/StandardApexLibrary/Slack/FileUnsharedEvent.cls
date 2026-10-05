global class FileUnsharedEvent extends Slack.Event {
    global FileUnsharedEvent() { }

    global virtual Boolean equals(Object o) { return false; }

    global String getChannelId() { return null; }

    global String getEventTs() { return null; }

    global Slack.FileUnsharedEvent.File getFile() { return null; }

    global String getFileId() { return null; }

    global virtual String getSubtype() { return null; }

    global override String getType() { return null; }

    global String getUserId() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setChannelId(String channelId) { }

    global void setEventTs(String eventTs) { }

    global void setFile(Slack.FileUnsharedEvent.File file) { }

    global void setFileId(String fileId) { }

    global void setUserId(String userId) { }

    global override String toString() { return null; }

    global class File {
        global File() { }

        global Slack.FileUnsharedEvent.File clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getId() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setId(String id) { }

        global override virtual String toString() { return null; }
    }
}