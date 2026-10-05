global class Option {
    global Option(String text, String value) { }

    global virtual Boolean equals(Object o) { return false; }

    global String getText() { return null; }

    global String getValue() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}