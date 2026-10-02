global class ImCreatedEvent extends Slack.Event {
    global Object ImCreatedEvent() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global Slack.ImCreatedEvent.Channel getChannel() { return null; }

    global virtual String getSubtype() { return null; }

    global override String getType() { return null; }

    global String getUser() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setChannel(Slack.ImCreatedEvent.Channel channel) { }

    global void setUser(String user) { }

    global override String toString() { return null; }

    global class Channel {
        global Object Channel() { return null; }

        global Slack.ImCreatedEvent.Channel clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global override virtual String toString() { return null; }
    }
}