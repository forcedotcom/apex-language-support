global abstract class ActionDispatcher implements Slack.RequestDispatcher {
    global Object ActionDispatcher() { return null; }

    global virtual Boolean allowUnauthenticatedUsers() { return false; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global abstract Slack.ActionHandler invoke(Map parameters, Slack.RequestContext context);

    global override virtual String toString() { return null; }
}