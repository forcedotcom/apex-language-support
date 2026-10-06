global class ResultParsingContext {
    global String columnName { get; }
    global String columnType { get; }
    global String connectorType { get; }
    global String extensionPoint { get; }
    global String rawValue { get; }
    global String tableName { get; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}