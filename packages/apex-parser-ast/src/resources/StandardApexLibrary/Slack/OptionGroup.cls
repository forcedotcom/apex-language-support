global class OptionGroup {
    global OptionGroup(String label, List options) { }

    global virtual Boolean equals(Object o) { return false; }

    global String getLabel() { return null; }

    global List getOptions() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}