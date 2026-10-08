global class ComponentIteration {
    global List childComponents { get; }
    global Object iterationValue { get; }
    global ApexPages.Component parent { get; }

    global virtual Boolean equals(Object o) { return false; }

    global ApexPages.Component getComponentById(String id) { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}