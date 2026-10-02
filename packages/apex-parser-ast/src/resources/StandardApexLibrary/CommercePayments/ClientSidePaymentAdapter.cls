global interface ClientSidePaymentAdapter {
    virtual Boolean equals(Object arg0);

    abstract String getClientComponentName();

    abstract Map getClientConfiguration();

    virtual Integer hashCode();

    abstract commercepayments.ClientResponse processClientRequest(commercepayments.ClientRequestContext context, Map paymentsData);

    virtual String toString();
}