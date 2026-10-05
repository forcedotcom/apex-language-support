global class MatchEngineSettings {
    global Set matchableFields { get; set; }
    global Integer maxBatchSize { get; set; }
    global Integer maxMatchResults { get; set; }
    global Integer minMatchConfidenceThreshold { get; set; }

    global MatchEngineSettings(Integer maxBatchSize, Integer maxMatchResults, Integer minMatchConfidenceThreshold) { }

    global MatchEngineSettings(Integer maxBatchSize, Integer maxMatchResults, Integer minMatchConfidenceThreshold, Set matchableFields) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}