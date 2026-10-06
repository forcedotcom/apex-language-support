global class ActionPayload {
    global virtual Boolean equals(Object o) { return false; }

    global String getName() { return null; }

    global String getType() { return null; }

    global Object getValue() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }

    global class Builder {
        global Builder() { }

        global Slack.ActionPayload build() { return null; }

        global Slack.ActionPayload.Builder clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global Slack.ActionPayload.Builder name(String name) { return null; }

        global override virtual String toString() { return null; }

        global Slack.ActionPayload.Builder type(String type) { return null; }

        global Slack.ActionPayload.Builder value(Object value) { return null; }
    }
}