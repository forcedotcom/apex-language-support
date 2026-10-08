global interface SandboxContext {
    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    abstract Id organizationId();

    abstract Id sandboxId();

    abstract String sandboxName();

    virtual String toString();
}