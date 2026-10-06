global class OrgInstrumentationContext {
    global OrgInstrumentationContext(System.OrgMetricPublishTypeEnum publishType) { }

    global void end() { }

    global virtual Boolean equals(Object o) { return false; }

    global Long getDuration() { return 0L; }

    global System.OrgMetricPublishTypeEnum getPublishType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void startTime() { }

    global override virtual String toString() { return null; }
}