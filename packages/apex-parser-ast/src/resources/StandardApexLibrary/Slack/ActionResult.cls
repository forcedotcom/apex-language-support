global class ActionResult {
    global virtual Boolean equals(Object o) { return false; }

    global static Slack.ActionResult error(Exception _exception) { return null; }

    global static Slack.ActionResult error(Exception _exception, Slack.ErrorReport errorReport) { return null; }

    global Exception getException() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isOk() { return false; }

    global static Slack.ActionResult ok() { return null; }

    global override virtual String toString() { return null; }
}