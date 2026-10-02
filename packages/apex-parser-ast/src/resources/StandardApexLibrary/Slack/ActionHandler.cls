global class ActionHandler {
    global static Slack.ActionHandler ack(Slack.CallableHandler handler) { return null; }

    global static Slack.ActionHandler ack(Slack.RunnableHandler handler) { return null; }

    global static Slack.ActionHandler clearModal(Slack.CallableHandler handler) { return null; }

    global static Slack.ActionHandler clearModal(Slack.RunnableHandler handler) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global static Slack.ActionHandler modal(Slack.ModalHandler handler) { return null; }

    global static Slack.ActionHandler modal(Slack.ModalHandler handler, String stagedModalTitle) { return null; }

    global static Slack.ActionHandler pushModal(Slack.ModalHandler handler) { return null; }

    global static Slack.ActionHandler pushModal(Slack.ModalHandler handler, String stagedModalTitle) { return null; }

    global override virtual String toString() { return null; }

    global static Slack.ActionHandler updateModal(Slack.ModalHandler handler) { return null; }

    global static Slack.ActionHandler updateModal(Slack.ModalHandler handler, String stagedModalTitle) { return null; }
}