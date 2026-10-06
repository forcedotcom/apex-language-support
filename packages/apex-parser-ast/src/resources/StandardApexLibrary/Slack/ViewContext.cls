global class ViewContext {
    global virtual Boolean equals(Object o) { return false; }

    global String getHash() { return null; }

    global String getId() { return null; }

    global String getPreviousViewId() { return null; }

    global String getType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }

    global class Builder {
        global Builder() { }

        global Slack.ViewContext build() { return null; }

        global Slack.ViewContext.Builder clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Slack.ViewContext.Builder hash(String hash) { return null; }

        global virtual Integer hashCode() { return 0; }

        global Slack.ViewContext.Builder id(String id) { return null; }

        global Slack.ViewContext.Builder previousViewId(String previousViewId) { return null; }

        global override virtual String toString() { return null; }

        global Slack.ViewContext.Builder type(String type) { return null; }
    }
}