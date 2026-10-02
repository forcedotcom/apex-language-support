global class MatchEngineSettings {
    global Set matchableFields { get; set; }
    global Integer maxBatchSize { get; set; }
    global Integer maxMatchResults { get; set; }
    global Integer minMatchConfidenceThreshold { get; set; }

    global Object MatchEngineSettings(Integer maxBatchSize, Integer maxMatchResults, Integer minMatchConfidenceThreshold) { return null; }

    global Object MatchEngineSettings(Integer maxBatchSize, Integer maxMatchResults, Integer minMatchConfidenceThreshold, Set matchableFields) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}