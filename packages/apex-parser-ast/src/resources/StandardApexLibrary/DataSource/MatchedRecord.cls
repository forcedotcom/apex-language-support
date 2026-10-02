global class MatchedRecord {
    global Map additionalInformation;
    global Map data;
    global List diffs;
    global Double score;

    global Boolean equals(Object obj) { return false; }

    global static DataSource.MatchedRecord get(Map data, Double score, List diffs, Map additionalInformation) { return null; }

    global Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}