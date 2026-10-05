global with sharing class EmailToSalesforceHandler implements Messaging.InboundEmailHandler {
    global EmailToSalesforceHandler() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}