global interface IAsyncDeleteCallback {
    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    abstract void processDelete(Database.DeleteResult deleteResult);

    virtual String toString();
}