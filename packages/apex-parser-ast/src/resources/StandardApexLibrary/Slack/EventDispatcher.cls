global abstract class EventDispatcher implements Slack.RequestDispatcher {
    global Object EventDispatcher() { return null; }

    global virtual Boolean allowUnauthenticatedUsers() { return false; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global abstract Slack.ActionHandler invoke(Slack.EventParameters parameters, Slack.RequestContext context);

    global override virtual String toString() { return null; }
}