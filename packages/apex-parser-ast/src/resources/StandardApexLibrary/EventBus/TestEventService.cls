global class TestEventService {
    global Object TestEventService() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global static void publishEvent(String eventName, Map payload) { }

    global override virtual String toString() { return null; }
}