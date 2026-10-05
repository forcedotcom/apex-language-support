global class ModalView {
    global static Slack.ModalView.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getExternalId() { return null; }

    global Slack.ViewReference getViewReference() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override String toString() { return null; }

    global class Builder {
        global Builder() { }

        global Slack.ModalView.Builder blocksAsString(String blocksJson) { return null; }

        global Slack.ModalView build() { return null; }

        global Slack.ModalView.Builder clearOnClose(Boolean clearOnClose) { return null; }

        global Slack.ModalView.Builder clone() { return null; }

        global Slack.ModalView.Builder close(String closeLabel) { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Slack.ModalView.Builder externalId(String externalId) { return null; }

        global virtual Integer hashCode() { return 0; }

        global Slack.ModalView.Builder onCloseAction(System.Type dispatcherClass, Map properties) { return null; }

        global Slack.ModalView.Builder onSubmitAction(System.Type dispatcherClass, Map properties) { return null; }

        global Slack.ModalView.Builder submit(String submit) { return null; }

        global Slack.ModalView.Builder title(String title) { return null; }

        global override virtual String toString() { return null; }

        global Slack.ModalView.Builder viewReference(Slack.ViewReference viewReference) { return null; }
    }
}