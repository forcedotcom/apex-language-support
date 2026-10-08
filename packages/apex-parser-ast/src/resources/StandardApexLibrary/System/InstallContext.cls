global interface InstallContext {
    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    abstract Id installerId();

    abstract Boolean isPush();

    abstract Boolean isUpgrade();

    abstract Id organizationId();

    abstract System.Version previousVersion();

    virtual String toString();
}