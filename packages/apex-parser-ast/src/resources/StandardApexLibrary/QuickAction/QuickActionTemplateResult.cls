global class QuickActionTemplateResult {
    global String contextid { get; }
    global SObject defaultvalueformulas { get; }
    global SObject defaultvalues { get; }
    global List errors { get; }
    global Boolean success { get; }

    global Boolean equals(Object obj) { return false; }

    global String getContextId() { return null; }

    global SObject getDefaultValueFormulas() { return null; }

    global SObject getDefaultValues() { return null; }

    global List getErrors() { return null; }

    global Integer hashCode() { return 0; }

    global Boolean isSuccess() { return false; }

    global String toString() { return null; }
}