global with sharing class EmailToSubmissionHandler implements Messaging.InboundEmailHandler {
    global EmailToSubmissionHandler() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}