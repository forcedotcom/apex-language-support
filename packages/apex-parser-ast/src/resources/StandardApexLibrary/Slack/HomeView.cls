global class HomeView {
    global static Slack.HomeView.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }

    global class Builder {
        global Builder() { }

        global Slack.HomeView.Builder blocksAsString(String blocksJson) { return null; }

        global Slack.HomeView build() { return null; }

        global Slack.HomeView.Builder clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Slack.HomeView.Builder externalId(String externalId) { return null; }

        global virtual Integer hashCode() { return 0; }

        global override virtual String toString() { return null; }

        global Slack.HomeView.Builder viewReference(Slack.ViewReference viewReference) { return null; }
    }
}