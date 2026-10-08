global interface CallableHandler {
    abstract Slack.ActionResult call();

    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    virtual String toString();
}