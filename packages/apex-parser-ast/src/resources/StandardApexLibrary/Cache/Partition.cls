/**
 * Base class of Cache.OrgPartition and Cache.SessionPartition . Use the subclasses to manage the cache partition for org caches and session caches.
 */
global class Partition {

  /**
   * Returns true if the cache partition contains a cached value corresponding to the specified key.
   * @param key A case-sensitive string value that uniquely identifies a cached value.
   * @return Boolean
   */
  public Boolean contains(String key) {}

  /**
   * Returns true if the cache partition contains a cached value corresponding to the specified key.
   * @param keys 
   * @return Map <String, Boolean>
   */
  public Map <String, Boolean> contains(Set<String> keys) {}

  /**
   * Generates a fully qualified key from the passed-in key components. The format of the generated key string is namespace.partition.key .
   * @param namespace The namespace of the cache key.
   * @param partition The partition of the cache key.
   * @param key The name of the cache key.
   * @return String
   */
  public static String createFullyQualifiedKey(String namespace, String partition, String key) {}

  /**
   * Generates a fully qualified partition name from the passed-in namespace and partition. The format of the generated partition string is namespace.partition .
   * @param namespace The namespace of the cache key.
   * @param partition The partition of the cache key.
   * @return String
   */
  public static String createFullyQualifiedPartition(String namespace, String partition) {}

  /**
   * Returns the cached value corresponding to the specified key from the cache partition.
   * @param key A case-sensitive string value that uniquely identifies a cached value.
   * @return Object
   */
  public Object get(String key) {}

  /**
   * Returns the cached value corresponding to the specified key from the cache partition.
   * @param keys 
   * @return Map <String, Object>
   */
  public Map <String, Object> get(Set <String> keys) {}

  /**
   * Returns the cached value corresponding to the specified key from the cache partition.
   * @param cacheBuilder 
   * @param key A case-sensitive string value that uniquely identifies a cached value.
   * @return Object
   */
  public Object get(System.Type cacheBuilder, String key) {}

  /**
   * Returns the average item size of all the keys fetched from the partition, in bytes.
   * @return Long
   */
  public Long getAvgGetSize() {}

  /**
   * Returns the average time taken to get a key from the partition, in nanoseconds.
   * @return Long
   */
  public Long getAvgGetTime() {}

  /**
   * Deprecated and available only in API versions 49.0 and earlier. Returns the average item size for keys in the partition, in bytes.
   * @return Long
   */
  public Long getAvgValueSize() {}

  /**
   * Returns the percentage of cache used of the total capacity for this partition.
   * @return Double
   */
  public Double getCapacity() {}

  /**
   * Returns a set of all keys that are stored in the cache partition and visible to the invoking namespace.
   * @return Set<String>
   */
  public Set<String> getKeys() {}

  /**
   * Returns the maximum item size of all the keys fetched from the partition, in bytes.
   * @return Long
   */
  public Long getMaxGetSize() {}

  /**
   * Returns the maximum time taken to get a key from the partition, in nanoseconds.
   * @return Long
   */
  public Long getMaxGetTime() {}

  /**
   * Deprecated and available only in API versions 49.0 and earlier. Returns the maximum item size for keys in the partition, in bytes.
   * @return Long
   */
  public Long getMaxValueSize() {}

  /**
   * Returns the miss rate in the partition.
   * @return Double
   */
  public Double getMissRate() {}

  /**
   * Returns the name of this cache partition.
   * @return String
   */
  public String getName() {}

  /**
   * Returns the total number of keys in the partition.
   * @return Long
   */
  public Long getNumKeys() {}

  /**
   * Returns true if the Salesforce session is available. Only applies to Cache.SessionPartition . The session cache isn’t available when an active session isn’t present, such as in asynchronous Apex or code called by asynchronous Apex. For example, if batch Apex causes an Apex trigger to execute, the session cache isn’t available in the trigger because the trigger runs in asynchronous context.
   * @return Boolean
   */
  public Boolean isAvailable() {}

  /**
   * Stores the specified key/value pair as a cached entry in the cache partition. The put method can write only to the cache in your org’s namespace.
   * @param key A case-sensitive string value that uniquely identifies a cached value.
   * @param value The value to store in the cache. The cached value must be serializable.
   */
  public void put(String key, Object value) {}

  /**
   * Stores the specified key/value pair as a cached entry in the cache partition. The put method can write only to the cache in your org’s namespace.
   * @param key A case-sensitive string value that uniquely identifies a cached value.
   * @param value The value to store in the cache. The cached value must be serializable.
   * @param visibility 
   */
  public void put(String key, Object value, cache.Visibility visibility) {}

  /**
   * Stores the specified key/value pair as a cached entry in the cache partition. The put method can write only to the cache in your org’s namespace.
   * @param key A case-sensitive string value that uniquely identifies a cached value.
   * @param value The value to store in the cache. The cached value must be serializable.
   * @param ttlSecs 
   */
  public void put(String key, Object value, Integer ttlSecs) {}

  /**
   * Stores the specified key/value pair as a cached entry in the cache partition. The put method can write only to the cache in your org’s namespace.
   * @param key A case-sensitive string value that uniquely identifies a cached value.
   * @param value The value to store in the cache. The cached value must be serializable.
   * @param ttlSecs 
   * @param visibility 
   * @param immutable 
   */
  public void put(String key, Object value, Integer ttlSecs, cache.Visibility visibility, Boolean immutable) {}

  /**
   * Deletes the cached value corresponding to the specified key from this cache partition.
   * @param key A case-sensitive string value that uniquely identifies a cached value.
   * @return Boolean
   */
  public Boolean remove(String key) {}

  /**
   * Deletes the cached value corresponding to the specified key from this cache partition.
   * @param cacheBuilder 
   * @param key A case-sensitive string value that uniquely identifies a cached value.
   * @return Boolean
   */
  public Boolean remove(System.Type cacheBuilder, String key) {}

  /**
   * Validates that the specified class implements the CacheBuilder interface.
   * @param cacheBuilder The class to validate.
   */
  public static void validateCacheBuilder(System.Type cacheBuilder) {}

  /**
   * Validates a cache key. This method throws a Cache.InvalidParamException if the key is not valid. A valid key is not null and contains alphanumeric characters.
   * @param isDefault Set to true if the key references a default partition. Otherwise, set to false .
   * @param key The key to validate.
   */
  public static void validateKey(Boolean isDefault, String key) {}

  /**
   * Validates a cache key and ensures that the cache value is non-null. This method throws a Cache.InvalidParamException if the key or value is not valid. A valid key is not null and contains alphanumeric characters.
   * @param isDefault Set to true if the key references a default partition. Otherwise, set to false .
   * @param key The key to validate.
   * @param value The cache value to validate.
   */
  public static void validateKeyValue(Boolean isDefault, String key, Object value) {}

  /**
   * Validates the specified cache keys. This method throws a Cache.InvalidParamException if the key is not valid. A valid key is not null and contains alphanumeric characters.
   * @param isDefault Set to true if the key references a default partition. Otherwise, set to false .
   * @param keys A set of key string values to validate.
   */
  public static void validateKeys(Boolean isDefault, Set<String> keys) {}

  /**
   * Validates the partition name — for example, that it is not null.
   * @param name The name of the partition to validate.
   */
  public static void validatePartitionName(String name) {}

}