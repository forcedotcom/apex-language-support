global class AppUninstalledEvent extends Slack.Event {
    global AppUninstalledEvent() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual String getSubtype() { return null; }

    global override String getType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override String toString() { return null; }
}