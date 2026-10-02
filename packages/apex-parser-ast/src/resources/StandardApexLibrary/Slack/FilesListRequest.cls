global class FilesListRequest {
    global static Slack.FilesListRequest.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getChannel() { return null; }

    global Integer getCount() { return 0; }

    global Integer getPage() { return 0; }

    global String getTeamId() { return null; }

    global String getTsFrom() { return null; }

    global String getTsTo() { return null; }

    global List getTypes() { return null; }

    global String getUser() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isShowFilesHiddenByLimit() { return false; }

    global override String toString() { return null; }

    global class Builder {
        global Object Builder() { return null; }

        global Slack.FilesListRequest build() { return null; }

        global Slack.FilesListRequest.Builder channel(String channel) { return null; }

        global Slack.FilesListRequest.Builder clone() { return null; }

        global Slack.FilesListRequest.Builder count(Integer count) { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global Slack.FilesListRequest.Builder page(Integer page) { return null; }

        global Slack.FilesListRequest.Builder showFilesHiddenByLimit(Boolean showFilesHiddenByLimit) { return null; }

        global Slack.FilesListRequest.Builder teamId(String teamId) { return null; }

        global override virtual String toString() { return null; }

        global Slack.FilesListRequest.Builder tsFrom(String tsFrom) { return null; }

        global Slack.FilesListRequest.Builder tsTo(String tsTo) { return null; }

        global Slack.FilesListRequest.Builder types(List types) { return null; }

        global Slack.FilesListRequest.Builder user(String user) { return null; }
    }
}