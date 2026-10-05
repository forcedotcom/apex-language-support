global with sharing class EmailToCaseHandler implements Messaging.InboundEmailHandler {
    global EmailToCaseHandler() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}