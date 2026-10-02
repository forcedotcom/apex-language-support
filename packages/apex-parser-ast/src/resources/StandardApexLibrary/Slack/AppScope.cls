global class AppScope {
    global Object AppScope() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getDescription() { return null; }

    global String getName() { return null; }

    global String getTokenType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isSensitive() { return false; }

    global void setDescription(String description) { }

    global void setName(String name) { }

    global void setSensitive(Boolean sensitive) { }

    global void setTokenType(String tokenType) { }

    global override String toString() { return null; }
}