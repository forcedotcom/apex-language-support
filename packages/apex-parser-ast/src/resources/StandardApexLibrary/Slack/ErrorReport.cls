global class ErrorReport {
    global static Slack.ErrorReport.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getChannelId() { return null; }

    global String getMessage() { return null; }

    global Slack.ViewReference getMessageView() { return null; }

    global Slack.ViewReference getModalView() { return null; }

    global String getUserId() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isEmpty() { return false; }

    global override virtual String toString() { return null; }

    global class Builder {
        global Object Builder() { return null; }

        global Slack.ErrorReport build() { return null; }

        global Slack.ErrorReport.Builder channelId(String channelId) { return null; }

        global Slack.ErrorReport.Builder clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global Slack.ErrorReport.Builder message(String message) { return null; }

        global Slack.ErrorReport.Builder messageView(Slack.ViewReference viewReference) { return null; }

        global Slack.ErrorReport.Builder modalView(Slack.ViewReference viewReference) { return null; }

        global override virtual String toString() { return null; }

        global Slack.ErrorReport.Builder userId(String userId) { return null; }
    }
}