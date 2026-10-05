/**
 * Parent class for other RichMessaging timing classes.
 */
global virtual class AbstractTiming {
    global AbstractTiming() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}