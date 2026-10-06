global interface IAsyncSaveCallback {
    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    abstract void processSave(Database.SaveResult saveResult);

    virtual String toString();
}