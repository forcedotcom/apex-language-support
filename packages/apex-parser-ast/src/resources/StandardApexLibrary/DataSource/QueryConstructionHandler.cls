global interface QueryConstructionHandler {
    abstract String buildQuery(DataSource.QueryConstructionContext context);

    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    virtual String toString();
}