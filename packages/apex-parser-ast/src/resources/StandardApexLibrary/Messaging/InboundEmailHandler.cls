global interface InboundEmailHandler {
    virtual Boolean equals(Object arg0);

    abstract Messaging.InboundEmailResult handleInboundEmail(Messaging.InboundEmail inboundEmail, Messaging.InboundEnvelope inboundEnvelope);

    virtual Integer hashCode();

    virtual String toString();
}