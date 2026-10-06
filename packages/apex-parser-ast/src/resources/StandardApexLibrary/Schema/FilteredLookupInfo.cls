global class FilteredLookupInfo {
    global List controllingfields { get; }
    global Boolean dependent { get; }
    global Boolean optionalfilter { get; }

    global Boolean equals(Object obj) { return false; }

    global List getControllingFields() { return null; }

    global Integer hashCode() { return 0; }

    global Boolean isDependent() { return false; }

    global Boolean isOptionalFilter() { return false; }

    global String toString() { return null; }
}