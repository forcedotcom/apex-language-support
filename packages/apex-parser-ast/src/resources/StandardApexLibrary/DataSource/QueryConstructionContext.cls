global class QueryConstructionContext {
    global String connectorType { get; }
    global String extensionPoint { get; }
    global Integer limitValue { get; }
    global Integer offsetValue { get; }
    global List projections { get; }
    global String tableName { get; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}