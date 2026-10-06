global interface ResultParsingHandler {
    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    abstract Map parseResult(DataSource.ResultParsingContext context);

    virtual String toString();
}