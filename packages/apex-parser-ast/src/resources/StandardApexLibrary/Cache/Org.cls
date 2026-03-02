/**
 * Use the Cache.Org class to add, retrieve, and manage values in the org cache. Unlike the session cache, the org cache is not tied to any session and is available to the organization across requests and to all users.
 */
public class Org {

  /**
   * Returns true if the org cache contains a cached value corresponding to the specified key.
   * @param key A case-sensitive string value that uniquely identifies a cached value. For information about the format of the key name, see Usage .
   * @return Boolean
   */
  public static Boolean contains(String key) {}

  /**
   * Returns true if the org cache contains a cached value corresponding to the specified key.
   * @param keys 
   * @return List< Boolean >
   */
  public static List< Boolean > contains(List< String > keys) {}

  /**
   * Returns true if the org cache contains a cached value corresponding to the specified key.
   * @param keys 
   * @return Map < String , Boolean >
   */
  public static Map < String , Boolean > contains(Set< String > keys) {}

  /**
   * Returns the cached value corresponding to the specified key from the org cache.
   * @param key A case-sensitive string value that uniquely identifies a cached value. For information about the format of the key name, see Usage .
   * @return Object
   */
  public static Object get(String key) {}

  /**
   * Returns the cached value corresponding to the specified key from the org cache.
   * @param cacheBuilder 
   * @param key A case-sensitive string value that uniquely identifies a cached value. For information about the format of the key name, see Usage .
   * @return Object
   */
  public static Object get(System.Type cacheBuilder, String key) {}

  /**
   * Returns the cached value corresponding to the specified key from the org cache.
   * @param keys 
   * @return Map < String , Object >
   */
  public static Map < String , Object > get(Set < String > keys) {}

  /**
   * Returns the average item size of all the keys fetched from the org cache, in bytes.
   * @return Long
   */
  public static Long getAvgGetSize() {}

  /**
   * Returns the average time taken to get a key from the org cache, in nanoseconds.
   * @return Long
   */
  public static Long getAvgGetTime() {}

  /**
   * Deprecated and available only in API versions 49.0 and earlier. Returns the average item size for keys in the org cache, in bytes.
   * @return Long
   */
  public static Long getAvgValueSize() {}

  /**
   * Returns the percentage of org cache capacity that has been used.
   * @return Double
   */
  public static Double getCapacity() {}

  /**
   * Returns a set of all keys that are stored in the org cache and visible to the invoking namespace.
   * @return Set< String >
   */
  public static Set< String > getKeys() {}

  /**
   * Returns the maximum item size of all the keys fetched from the org cache, in bytes.
   * @return Long
   */
  public static Long getMaxGetSize() {}

  /**
   * Returns the maximum time taken to get a key from the org cache, in nanoseconds.
   * @return Long
   */
  public static Long getMaxGetTime() {}

  /**
   * Deprecated and available only in API versions 49.0 and earlier. Returns the maximum item size for keys in the org cache, in bytes.
   * @return Long
   */
  public static Long getMaxValueSize() {}

  /**
   * Returns the miss rate in the org cache.
   * @return Double
   */
  public static Double getMissRate() {}

  /**
   * Returns the name of the default cache partition.
   * @return String
   */
  public String getName() {}

  /**
   * Returns the total number of keys in the org cache.
   * @return Long
   */
  public static Long getNumKeys() {}

  /**
   * Returns a partition from the org cache that corresponds to the specified partition name.
   * @param partitionName A partition name that is qualified by the namespace, for example, namespace.partition .
   * @return cache.OrgPartition
   */
  public static cache.OrgPartition getPartition(String partitionName) {}

  /**
   * Stores the specified key/value pair as a cached entry in the org cache. The put method can write only to the cache in your org’s namespace.
   * @param key A case-sensitive string value that uniquely identifies a cached value. For information about the format of the key name, see Usage .
   * @param value The value to store in the cache. The cached value must be serializable.
   */
  public static void put(String key, Object value) {}

  /**
   * Stores the specified key/value pair as a cached entry in the org cache. The put method can write only to the cache in your org’s namespace.
   * @param key A case-sensitive string value that uniquely identifies a cached value. For information about the format of the key name, see Usage .
   * @param value The value to store in the cache. The cached value must be serializable.
   * @param visibility 
   */
  public static void put(String key, Object value, Cache.Visibility visibility) {}

  /**
   * Stores the specified key/value pair as a cached entry in the org cache. The put method can write only to the cache in your org’s namespace.
   * @param key A case-sensitive string value that uniquely identifies a cached value. For information about the format of the key name, see Usage .
   * @param value The value to store in the cache. The cached value must be serializable.
   * @param ttlSecs 
   */
  public static void put(String key, Object value, Integer ttlSecs) {}

  /**
   * Stores the specified key/value pair as a cached entry in the org cache. The put method can write only to the cache in your org’s namespace.
   * @param key A case-sensitive string value that uniquely identifies a cached value. For information about the format of the key name, see Usage .
   * @param value The value to store in the cache. The cached value must be serializable.
   * @param ttlSecs 
   * @param visibility 
   * @param immutable 
   */
  public static void put(String key, Object value, Integer ttlSecs, cache.Visibility visibility, Boolean immutable) {}

  /**
   * Deletes the cached value corresponding to the specified key from the org cache.
   * @param key A case-sensitive string value that uniquely identifies a cached value. For information about the format of the key name, see Usage .
   * @return Boolean
   */
  public static Boolean remove(String key) {}

  /**
   * Deletes the cached value corresponding to the specified key from the org cache.
   * @param cacheBuilder 
   * @param key A case-sensitive string value that uniquely identifies a cached value. For information about the format of the key name, see Usage .
   * @return Boolean
   */
  public static Boolean remove(System.Type cacheBuilder, String key) {}

}