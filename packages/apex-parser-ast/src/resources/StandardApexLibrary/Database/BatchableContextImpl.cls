global class BatchableContextImpl implements Database.BatchableContext {
    global virtual Boolean equals(Object o) { return false; }

    global Id getChildJobId() { return null; }

    global Id getJobId() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}