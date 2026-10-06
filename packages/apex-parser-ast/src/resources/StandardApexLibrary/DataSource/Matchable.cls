global interface Matchable {
    virtual Boolean equals(Object arg0);

    abstract DataSource.MatchEngineSettings getMatchEngineSettings(String tableName);

    virtual Integer hashCode();

    abstract DataSource.MatchResult match(DataSource.MatchContext matchContext);

    virtual String toString();
}