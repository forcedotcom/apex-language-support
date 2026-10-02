global class FileChangeEvent extends Slack.Event {
    global Object FileChangeEvent() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global Slack.FileChangeEvent.File getFile() { return null; }

    global String getFileId() { return null; }

    global virtual String getSubtype() { return null; }

    global override String getType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setFile(Slack.FileChangeEvent.File file) { }

    global void setFileId(String fileId) { }

    global override String toString() { return null; }

    global class File {
        global Object File() { return null; }

        global Slack.FileChangeEvent.File clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getId() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setId(String id) { }

        global override virtual String toString() { return null; }
    }
}