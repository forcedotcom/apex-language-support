/**
 * Contains methods for the Map collection type.
 */
global class Map {

  global Map() {}

  /**
   * Removes all of the key-value mappings from the map.
   */
  global void clear() {}

  /**
   * Makes a duplicate copy of the map.
   * @return Map<Object, Object>
   */
  global Map<Object, Object> clone() {}

  /**
   * Returns true if the map contains a mapping for the specified key.
   * @param key 
   * @return Boolean
   */
  global Boolean containsKey(Object key) {}

  /**
   * Makes a duplicate copy of a map, including sObject records if this is a map with sObject record values.
   * @return Map<Object, Object>
   */
  global Map<Object, Object> deepClone() {}

  /**
   * Compares this map with the specified map and returns true if both maps are equal; otherwise, returns false .
   * @param map2 The map2 argument is the map to compare this map with.
   * @return Boolean
   */
  global Boolean equals(Map map2) {}

  /**
   * Returns the value to which the specified key is mapped, or null if the map contains no value for this key.
   * @param key 
   * @return V
   */
  global V get(K key) {}

  /**
   * Returns the token of the sObject type that makes up the map values.
   * @return Schema.SObjectType
   */
  global Schema.SObjectType getSObjectType() {}

  /**
   * Returns the hashcode corresponding to this map.
   * @return Integer
   */
  global Integer hashCode() {}

  /**
   * Returns true if the map has zero key-value pairs.
   * @return Boolean
   */
  global Boolean isEmpty() {}

  /**
   * Returns a set that contains all of the keys in the map.
   * @return Set<K>
   */
  global Set<K> keySet() {}

  /**
   * Associates the specified value with the specified key in the map.
   * @param key 
   * @param value 
   * @return V
   */
  global V put(K key, V value) {}

  /**
   * Copies all of the mappings from the specified map to the original map.
   * @param fromMap 
   */
  global void putAll(Map fromMap) {}

  /**
   * Copies all of the mappings from the specified map to the original map.
   * @param sobjectArray 
   */
  global void putAll(sObject[] sobjectArray) {}

  /**
   * Removes the mapping for the specified key from the map, if present, and returns the corresponding value.
   * @param key 
   * @return V
   */
  global V remove(K key) {}

  /**
   * Returns the number of key-value pairs in the map.
   * @return Integer
   */
  global Integer size() {}

  /**
   * Returns the string representation of the map.
   * @return String
   */
  global String toString() {}

  /**
   * Returns a list that contains all the values in the map.
   * @return List<V>
   */
  global List<V> values() {}

}
