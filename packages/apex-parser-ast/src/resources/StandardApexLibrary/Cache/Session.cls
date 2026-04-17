/**
 * Use the Cache.Session class to add, retrieve, and manage values in the session cache. The session cache is active as long as the user’s Salesforce session is valid (the user is logged in, and the session is not expired).
 */
global class Session {

  /**
   * Returns true if the session cache contains a cached value corresponding to the specified key.
   * @param key A case-sensitive string value that uniquely identifies a cached value. For information about the format of the key name, see Usage .
   * @return Boolean
   */
  public static Boolean contains(String key) {}

  /**
   * Returns true if the session cache contains a cached value corresponding to the specified key.
   * @param keys 
   * @return Map <String, Boolean>
   */
  public static Map <String, Boolean> contains(Set<String> keys) {}

  /**
   * Returns the cached value corresponding to the specified key from the session cache.
   * @param key A case-sensitive string value that uniquely identifies a cached value. For information about the format of the key name, see Usage .
   * @return Object
   */
  public static Object get(String key) {}

  /**
   * Returns the cached value corresponding to the specified key from the session cache.
   * @param keys 
   * @return Map <String, Object>
   */
  public static Map <String, Object> get(Set <String> keys) {}

  /**
   * Returns the cached value corresponding to the specified key from the session cache.
   * @param cacheBuilder 
   * @param key A case-sensitive string value that uniquely identifies a cached value. For information about the format of the key name, see Usage .
   * @return Object
   */
  public static Object get(System.Type cacheBuilder, String key) {}

  /**
   * Returns the average item size of all the keys fetched from the session cache, in bytes.
   * @return Long
   */
  public static Long getAvgGetSize() {}

  /**
   * Returns the average time taken to get a key from the session cache, in nanoseconds.
   * @return Long
   */
  public static Long getAvgGetTime() {}

  /**
   * Deprecated and available only in API versions 49.0 and earlier. Returns the average item size for keys in the session cache, in bytes.
   * @return Long
   */
  public static Long getAvgValueSize() {}

  /**
   * Returns the percentage of session cache capacity that has been used.
   * @return Double
   */
  public static Double getCapacity() {}

  /**
   * Returns all keys that are stored in the session cache and visible to the invoking namespace.
   * @return Set<String>
   */
  public static Set<String> getKeys() {}

  /**
   * Returns the maximum item size of all the keys fetched from the session cache, in bytes.
   * @return Long
   */
  public static Long getMaxGetSize() {}

  /**
   * Returns the maximum time taken to get a key from the session cache, in nanoseconds.
   * @return Long
   */
  public static Long getMaxGetTime() {}

  /**
   * Deprecated and available only in API versions 49.0 and earlier. Returns the maximum item size for keys in the session cache, in bytes.
   * @return Long
   */
  public static Long getMaxValueSize() {}

  /**
   * Returns the miss rate in the session cache.
   * @return Double
   */
  public static Double getMissRate() {}

  /**
   * Returns the name of the default cache partition.
   * @return String
   */
  public String getName() {}

  /**
   * Returns the total number of keys in the session cache.
   * @return Long
   */
  public static Long getNumKeys() {}

  /**
   * Returns a partition from the session cache that corresponds to the specified partition name.
   * @param partitionName A partition name that is qualified by the namespace, for example, namespace.partition .
   * @return cache.SessionPartition
   */
  public static cache.SessionPartition getPartition(String partitionName) {}

  /**
   * Returns true if the session cache is available for use. The session cache isn’t available when an active session isn’t present, such as in asynchronous Apex or code called by asynchronous Apex. For example, if batch Apex causes an Apex trigger to execute, the session cache isn’t available in the trigger because the trigger runs in asynchronous context.
   * @return Boolean
   */
  public static Boolean isAvailable() {}

  /**
   * Stores the specified key/value pair as a cached entry in the session cache. The put method can write only to the cache in your org’s namespace.
   * @param key A string that uniquely identifies the value to be cached. For information about the format of the key name, see Usage .
   * @param value The value to store in the cache. The cached value must be serializable.
   */
  public static void put(String key, Object value) {}

  /**
   * Stores the specified key/value pair as a cached entry in the session cache. The put method can write only to the cache in your org’s namespace.
   * @param key A string that uniquely identifies the value to be cached. For information about the format of the key name, see Usage .
   * @param value The value to store in the cache. The cached value must be serializable.
   * @param visibility 
   */
  public static void put(String key, Object value, Cache.Visibility visibility) {}

  /**
   * Stores the specified key/value pair as a cached entry in the session cache. The put method can write only to the cache in your org’s namespace.
   * @param key A string that uniquely identifies the value to be cached. For information about the format of the key name, see Usage .
   * @param value The value to store in the cache. The cached value must be serializable.
   * @param ttlSecs 
   */
  public static void put(String key, Object value, Integer ttlSecs) {}

  /**
   * Stores the specified key/value pair as a cached entry in the session cache. The put method can write only to the cache in your org’s namespace.
   * @param key A string that uniquely identifies the value to be cached. For information about the format of the key name, see Usage .
   * @param value The value to store in the cache. The cached value must be serializable.
   * @param ttlSecs 
   * @param visibility 
   * @param immutable 
   */
  public static void put(String key, Object value, Integer ttlSecs, cache.Visibility visibility, Boolean immutable) {}

  /**
   * Deletes the cached value corresponding to the specified key from the session cache.
   * @param key A case-sensitive string value that uniquely identifies a cached value. For information about the format of the key name, see Usage .
   * @return Boolean
   */
  public static Boolean remove(String key) {}

  /**
   * Deletes the cached value corresponding to the specified key from the session cache.
   * @param cacheBuilder 
   * @param key A case-sensitive string value that uniquely identifies a cached value. For information about the format of the key name, see Usage .
   * @return Boolean
   */
  public static Boolean remove(System.Type cacheBuilder, String key) {}

  global class SessionCacheException extends Exception {}

  global class SessionCacheNoSessionException extends Exception {}

}