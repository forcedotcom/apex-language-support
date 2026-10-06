global abstract class ShortcutDispatcher implements Slack.RequestDispatcher {
    global ShortcutDispatcher() { }

    global virtual Boolean allowUnauthenticatedUsers() { return false; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global abstract Slack.ActionHandler invoke(Slack.ShortcutParameters parameters, Slack.RequestContext context);

    global override virtual String toString() { return null; }
}