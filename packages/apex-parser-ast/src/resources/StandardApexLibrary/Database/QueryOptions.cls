global class QueryOptions {
    global static Database.QueryOptionsBuilder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getDataspace() { return null; }

    global Boolean getExplicitNamespace() { return false; }

    global Boolean getHonorEmptyStrings() { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}