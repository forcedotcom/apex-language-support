global class ScanResult {
    global Boolean isDone { get; set; }
    global Map result { get; set; }
    global String scanLocator { get; set; }

    global ScanResult(Map result, String scanLocator, Boolean isDone) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}