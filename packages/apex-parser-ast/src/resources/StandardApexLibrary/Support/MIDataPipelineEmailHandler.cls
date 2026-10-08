global with sharing class MIDataPipelineEmailHandler implements Messaging.InboundEmailHandler {
    global MIDataPipelineEmailHandler() { }

    global virtual Boolean equals(Object o) { return false; }

    global Messaging.InboundEmailResult handleInboundEmail(Messaging.InboundEmail email, Messaging.InboundEnvelope envelope) { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}