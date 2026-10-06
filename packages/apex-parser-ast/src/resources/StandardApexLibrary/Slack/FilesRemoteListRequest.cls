global class FilesRemoteListRequest {
    global static Slack.FilesRemoteListRequest.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getChannel() { return null; }

    global String getCursor() { return null; }

    global Integer getLimit() { return 0; }

    global String getTsFrom() { return null; }

    global String getTsTo() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override String toString() { return null; }

    global class Builder {
        global Builder() { }

        global Slack.FilesRemoteListRequest build() { return null; }

        global Slack.FilesRemoteListRequest.Builder channel(String channel) { return null; }

        global Slack.FilesRemoteListRequest.Builder clone() { return null; }

        global Slack.FilesRemoteListRequest.Builder cursor(String cursor) { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global Slack.FilesRemoteListRequest.Builder limitValue(Integer limitValue) { return null; }

        global override virtual String toString() { return null; }

        global Slack.FilesRemoteListRequest.Builder tsFrom(String tsFrom) { return null; }

        global Slack.FilesRemoteListRequest.Builder tsTo(String tsTo) { return null; }
    }
}