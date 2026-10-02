global interface UninstallContext {
    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    abstract Id organizationId();

    virtual String toString();

    abstract Id uninstallerId();
}