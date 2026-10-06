global class FilePublicEvent extends Slack.Event {
    global FilePublicEvent() { }

    global virtual Boolean equals(Object o) { return false; }

    global String getEventTs() { return null; }

    global Slack.FilePublicEvent.File getFile() { return null; }

    global String getFileId() { return null; }

    global virtual String getSubtype() { return null; }

    global override String getType() { return null; }

    global String getUserId() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setEventTs(String eventTs) { }

    global void setFile(Slack.FilePublicEvent.File file) { }

    global void setFileId(String fileId) { }

    global void setUserId(String userId) { }

    global override String toString() { return null; }

    global class File {
        global File() { }

        global Slack.FilePublicEvent.File clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getId() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setId(String id) { }

        global override virtual String toString() { return null; }
    }
}