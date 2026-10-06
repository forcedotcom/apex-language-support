global class OrgInstrumentationService {
    global OrgInstrumentationService(System.OrgMetricServiceEnum service, String subServiceName, String featureGroupName, String featureName) { }

    global virtual Boolean equals(Object o) { return false; }

    global System.OrgInstrumentationOperation getInstrumentationOperation(String operationName, Map tags) { return null; }

    global System.OrgInstrumentationOperation getInstrumentationOperation(String operationName, Map tags, List buckets) { return null; }

    global System.OrgInstrumentationOperation getInstrumentationOperation(String operationName, Map tags, List percentileBuckets) { return null; }

    global Map getTracerContext() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void propagateContext(System.HttpRequest request) { }

    global override virtual String toString() { return null; }
}