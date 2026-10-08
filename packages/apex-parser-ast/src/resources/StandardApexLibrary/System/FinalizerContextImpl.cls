global with sharing class FinalizerContextImpl implements System.FinalizerContext {
    global virtual Boolean equals(Object o) { return false; }

    global Id getAsyncApexJobId() { return null; }

    global Exception getException() { return null; }

    global String getRequestId() { return null; }

    global System.ParentJobResult getResult() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}