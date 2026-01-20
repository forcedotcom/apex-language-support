/**
 * Contains methods for the Map collection type.
 * Namespace: System
 * @see https://developer.salesforce.com/docs/atlas.en-us.apexref.meta/apexref/apex_methods_system_map.htm
 */
public class Map {
	/**
	 * Removes all of the key-value mappings from the map.
	 */
	public void clear() { }

	/**
	 * Creates a shallow copy of the map.
	 * @return A new map that is a copy of the original map
	 */
	public Map<K, V> clone() { }

	/**
	 * Returns true if the map contains a mapping for the specified key.
	 * @param key The key to check for
	 * @return true if the key exists in the map, false otherwise
	 */
	public Boolean containsKey(Object key) { }

	/**
	 * Returns true if the map maps one or more keys to the specified value.
	 * @param value The value to check for
	 * @return true if the value exists in the map, false otherwise
	 */
	public Boolean containsValue(Object value) { }

	/**
	 * Returns a set that contains all of the keys in the map.
	 * @return A set containing all keys
	 */
	public Set<K> keySet() { }

	/**
	 * Associates the specified value with the specified key in the map.
	 * @param key The key with which the specified value is to be associated
	 * @param value The value to be associated with the specified key
	 * @return The previous value associated with the key, or null if there was no mapping
	 */
	public V put(K key, V value) { }

	/**
	 * Copies all of the mappings from the specified map to the map.
	 * @param fromMap The map containing mappings to copy
	 */
	public void putAll(Map<K, V> fromMap) { }

	/**
	 * Removes the mapping for the specified key from the map if present.
	 * @param key The key whose mapping is to be removed
	 * @return The previous value associated with the key, or null if there was no mapping
	 */
	public V remove(Object key) { }

	/**
	 * Returns the number of key-value mappings in the map.
	 * @return The size of the map
	 */
	public Integer size() { }

	/**
	 * Returns a list that contains all of the values in the map.
	 * @return A list containing all values
	 */
	public List<V> values() { }

	/**
	 * Returns the value to which the specified key is mapped, or null if the map contains no mapping for the key.
	 * @param key The key whose associated value is to be returned
	 * @return The value to which the specified key is mapped, or null if no mapping exists
	 */
	public V get(Object key) { }
}

