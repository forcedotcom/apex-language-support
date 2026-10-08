global class MatchContext {
    global List fields { get; set; }
    global Integer maxMatchResults { get; set; }
    global Integer minMatchConfidence { get; set; }
    global String tableName { get; set; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}