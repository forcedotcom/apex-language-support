global class ScanResult {
    global Boolean isDone { get; set; }
    global Map result { get; set; }
    global String scanLocator { get; set; }

    global Object ScanResult(Map result, String scanLocator, Boolean isDone) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}