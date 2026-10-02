/**
 * An interface for safely retrieving and removing values from a session or org cache. Use the interface to generate a value that you want to store in the cache. The interface checks for cache misses, which means you no longer need to check for null cache values yourself.
 */
global interface CacheBuilder {
    /**
     * Contains the logic that builds a cached value. You don’t call this method directly. Instead, it’s called indirectly when you reference the class that implements the CacheBuilder interface.
     * @return Object The value that was cached. Cast the return value to the appropriate type.
     */
    abstract Object doLoad(String arg);

    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    virtual String toString();
}