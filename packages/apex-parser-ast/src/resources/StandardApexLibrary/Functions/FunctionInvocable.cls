global interface FunctionInvocable {
    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    abstract String invoke(String payload, functions.FunctionContext context);

    virtual String toString();
}