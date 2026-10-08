global with sharing class EmailToIncidentHandler implements Messaging.InboundEmailHandler {
    global EmailToIncidentHandler() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}