/**
 * Base class of Cache.OrgPartition and Cache.SessionPartition. Use the subclasses to manage the cache partition for org caches and session caches.
 * Cache Key Format for Partition Methods
 * After you obtain the partition object (an instance of Cache.OrgPartition or Cache.SessionPartition), the methods to add, retrieve, and manage the cache values in a partition take the key name. The key name that you supply to these methods (get(), put(), remove(), and contains()) doesn’t include the namespace.partition prefix.
 */
global abstract class Partition {
    global Partition() { }

    /**
     * Returns true if the cache partition contains a cached value corresponding to the specified key.
     * @return true if a cache entry is found. Othewise, false.
     */
    global Boolean contains(String key) { return false; }

    /**
     * Returns true if the cache partition contains values for a specified set of keys.
     * Usage
     * The number of input keys cannot exceed the maximum limit of 10.
     * Example
     * In this example, the code checks for the presence of multiple keys on a partition. It fetches the cache key and the corresponding Boolean value for the key entry from the org cache of the partition.
     * // Assuming there is a partition p1 in the default 'local' namespace
     *
     * Set<String> keys = new Set<String>{'key1','key2','key3','key4','key5'};
     * Cache.OrgPartition orgPart = Cache.Org.getPartition('local.p1');
     * Map<String,Boolean> result = orgPart.contains(keys);
     * for(String key : result.keySet()) {
     *     system.debug('key: ' + key);
     *     system.debug('Is Key Present in the cache:' +  result.get(key));
     * }
     * In this example, the code checks for the presence of multiple keys on a partition. It fetches the cache key and the corresponding Boolean value for the key entry from the session cache of the partition.
     * // Assuming there are three partitions p1, p2, p3 with default 'local' namespace
     *
     * Set<String> keys = new Set<String>{'key1','key2','key3','key4','key5'};
     * Cache.SessionPartition sessionPart = Cache.Session.getPartition('local.p1');
     * Map<String,Boolean> result = sessionPart.contains(keys);
     * for(String key : result.keySet()) {
     *     system.debug('key: ' + key);
     *     system.debug('value: ' +  result.get(key));
     * }
     * @return Returns the cache key and corresponding Boolean value indicating that the key entry exists. The Boolean value is false if the key entry doesn't exist.
     */
    global Map contains(Set keys) { return null; }

    /**
     * Generates a fully qualified key from the passed-in key components. The format of the generated key string is namespace.partition.key.
     */
    global static String createFullyQualifiedKey(String namespace, String partition, String key) { return null; }

    /**
     * Generates a fully qualified partition name from the passed-in namespace and partition. The format of the generated partition string is namespace.partition.
     */
    global static String createFullyQualifiedPartition(String namespace, String partition) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the cached values corresponding to the specified set of keys from the cache partition.
     * Usage
     * The number of input keys cannot exceed the maximum limit of 10.
     * Examples
     * Fetch multiple keys from the org cache of a partition.
     * // Assuming there is a partition p1 in the default 'local' namespace
     *
     * Set<String> keys = new Set<String>{'key1','key2','key3','key4','key5'};
     * Cache.OrgPartition orgPart = Cache.Org.getPartition('local.p1');
     * Map<String,Object> result = orgPart.get(keys);
     * for(String key : result.keySet()) {
     *     system.debug('key: ' + key);
     *     system.debug('value: ' +  result.get(key));
     * }
     *
     * Fetch multiple keys from the session cache of a partition.
     * // Assuming there is a partition p1 in the default 'local' namespace
     *
     * Set<String> keys = new Set<String>{'key1','key2','key3','key4','key5'};
     * Cache.SessionPartition sessionPart = Cache.Session.getPartition('local.p1');
     * Map<String,Object> result = sessionPart.get(keys);
     * for(String key : result.keySet()) {
     *     system.debug('key: ' + key);
     *     system.debug('value: ' +  result.get(key));
     * }
     * @return Returns the cache key and corresponding value. Returns null when no corresponding value is found for an input key.
     */
    global Map get(Set keys) { return null; }

    /**
     * Returns the cached value corresponding to the specified key from the cache partition.
     * @return Object The cached value as a generic object type. Cast the returned value to the appropriate type.
     */
    global Object get(String key) { return null; }

    /**
     * Returns the cached value corresponding to the specified key from the partition cache. Use this method if your cached value is a class that implements the CacheBuilder interface.
     * @return Object The cached value as a generic object type. Cast the returned value to the appropriate type.
     */
    global Object get(System.Type cacheBuilder, String key) { return null; }

    /**
     * Returns the average item size of all the keys fetched from the partition, in bytes.
     */
    global Long getAvgGetSize() { return 0L; }

    /**
     * Returns the average time taken to get a key from the partition, in nanoseconds.
     */
    global Long getAvgGetTime() { return 0L; }

    /**
     * Deprecated and available only in API versions 49.0 and earlier. Returns the average item size for keys in the partition, in bytes.
     */
    global Long getAvgValueSize() { return 0L; }

    /**
     * Returns the percentage of cache used of the total capacity for this partition.
     * @return Used partition cache as a percentage number.
     */
    global Double getCapacity() { return 0.0; }

    /**
     * Returns a set of all keys that are stored in the cache partition and visible to the invoking namespace.
     * @return A set containing all cache keys.
     */
    global Set getKeys() { return null; }

    /**
     * Returns the maximum item size of all the keys fetched from the partition, in bytes.
     */
    global Long getMaxGetSize() { return 0L; }

    /**
     * Returns the maximum time taken to get a key from the partition, in nanoseconds.
     */
    global Long getMaxGetTime() { return 0L; }

    /**
     * Deprecated and available only in API versions 49.0 and earlier. Returns the maximum item size for keys in the partition, in bytes.
     */
    global Long getMaxValueSize() { return 0L; }

    /**
     * Returns the miss rate in the partition.
     */
    global Double getMissRate() { return 0.0; }

    /**
     * Returns the name of this cache partition.
     * @return The name of this cache partition.
     */
    global String getName() { return null; }

    /**
     * Returns the total number of keys in the partition.
     */
    global Long getNumKeys() { return 0L; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Returns true if the Salesforce session is available. Only applies to Cache.SessionPartition. The session cache isn’t available when an active session isn’t present, such as in asynchronous Apex or code called by asynchronous Apex. For example, if batch Apex causes an Apex trigger to execute, the session cache isn’t available in the trigger because the trigger runs in asynchronous context.
     */
    global Boolean isAvailable() { return false; }

    /**
     * Stores the specified key/value pair as a cached entry in the cache partition. The put method can write only to the cache in your org’s namespace.
     */
    global void put(String key, Object value) { }

    /**
     * Stores the specified key/value pair as a cached entry in the cache partition and sets the cached value’s lifetime.
     */
    global void put(String key, Object value, Integer ttlSecs) { }

    /**
     * Stores the specified key/value pair as a cached entry in the cache partition and sets the cached value’s visibility.
     */
    global void put(String key, Object value, cache.Visibility visibility) { }

    /**
     * Stores the specified key/value pair as a cached entry in the cache partition. This method also sets the cached value’s lifetime, visibility, and whether it can be overwritten by another namespace.
     */
    global void put(String key, Object value, Integer ttlSecs, cache.Visibility visibility, Boolean immutable) { }

    /**
     * Deletes the cached value corresponding to the specified key from this cache partition.
     * @return true if the cache value was successfully removed. Otherwise, false.
     */
    global Boolean remove(String key) { return false; }

    /**
     * Deletes the cached value corresponding to the specified key from the partition cache. Use this method if your cached value is a class that implements the CacheBuilder interface.
     * @return true if the cache value was successfully removed. Otherwise, false.
     */
    global Boolean remove(System.Type cacheBuilder, String key) { return false; }

    global override virtual String toString() { return null; }

    /**
     * Validates that the specified class implements the CacheBuilder interface.
     */
    global static void validateCacheBuilder(System.Type cacheBuilder) { }

    /**
     * Validates a cache key. This method throws a Cache.InvalidParamException if the key is not valid. A valid key is not null and contains alphanumeric characters.
     */
    global static void validateKey(Boolean isDefault, String key) { }

    /**
     * Validates a cache key and ensures that the cache value is non-null. This method throws a Cache.InvalidParamException if the key or value is not valid. A valid key is not null and contains alphanumeric characters.
     */
    global static void validateKeyValue(Boolean isDefault, String key, Object value) { }

    global static void validateKeys(Boolean isDefault, List keys) { }

    /**
     * Validates the specified cache keys. This method throws a Cache.InvalidParamException if the key is not valid. A valid key is not null and contains alphanumeric characters.
     */
    global static void validateKeys(Boolean isDefault, Set keys) { }

    /**
     * Validates the partition name — for example, that it is not null.
     */
    global static void validatePartitionName(String name) { }
}