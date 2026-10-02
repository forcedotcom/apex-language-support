global class MatchResult {
    global String errorMessage;
    global Integer index;
    global List matches;
    global Integer size;
    global Boolean success;
    global String tableName;
    global Double topScore;

    global Boolean equals(Object obj) { return false; }

    global static DataSource.MatchResult get(Boolean success, String errorMessage, String tableName, Integer index, Integer size, Double topScore, List matches) { return null; }

    global Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}