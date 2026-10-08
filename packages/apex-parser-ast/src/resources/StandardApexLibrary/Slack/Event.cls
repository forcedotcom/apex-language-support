global abstract class Event {
    global Event() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual String getSubtype() { return null; }

    global abstract String getType();

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}