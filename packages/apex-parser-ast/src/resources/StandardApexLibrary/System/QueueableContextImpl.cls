global class QueueableContextImpl implements System.QueueableContext {
    global virtual Boolean equals(Object o) { return false; }

    global Id getJobId() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}