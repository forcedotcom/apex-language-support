global class ViewsPushRequest {
    global static Slack.ViewsPushRequest.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getTriggerId() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override String toString() { return null; }

    global class Builder {
        global Builder() { }

        global Slack.ViewsPushRequest build() { return null; }

        global Slack.ViewsPushRequest.Builder clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global override virtual String toString() { return null; }

        global Slack.ViewsPushRequest.Builder triggerId(String triggerId) { return null; }

        global Slack.ViewsPushRequest.Builder view(Slack.ModalView view) { return null; }
    }
}