global class OptionDataResponse {
    global OptionDataResponse(List optionGroups) { }

    global OptionDataResponse(List options) { }

    global virtual Boolean equals(Object o) { return false; }

    global List getOptionGroups() { return null; }

    global List getOptions() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}