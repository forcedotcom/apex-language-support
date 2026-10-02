/**
 * Interface for a resolution strategy.
 * <p>Usage
 * When you implement this interface, you can register your apex class just like an extension provider class. Your class can then conditionally decide how to handle each extension invocation. You can delegate to a specific extension provider, you can execute default domain logic, or you can execute no logic at all.
 */
global interface ResolutionStrategy {
    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    /**
     * Returns a resolution object, which indicates how the resolution strategy was resolved. The resolution indicates whether default logic, extension provider logic, or no logic is executed.
     * @return Resolution object that indicates how the resolution strategy was resolved.
     */
    abstract CommerceExtension.Resolution resolve();

    virtual String toString();
}