global class SecondaryKeyApi {
    global virtual Boolean equals(Object o) { return false; }

    global static cache.SecondaryKeyApi get(String featureName) { return null; }

    global virtual Integer hashCode() { return 0; }

    global void putImmediate(String key, Object value, String secondaryKey) { }

    global Boolean remove(String key) { return false; }

    global Long scanForCount(String startKey, String endKey) { return 0L; }

    global cache.ScanResult scanForKeyValues(String startKey, String endKey, Integer batchSize) { return null; }

    global cache.ScanResult scanForMoreKeyValues(String scanLocator, Integer batchSize) { return null; }

    global override virtual String toString() { return null; }
}