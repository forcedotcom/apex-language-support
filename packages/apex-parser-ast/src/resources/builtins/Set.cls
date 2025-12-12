/**
 * Contains methods for the Set collection type.
 * Namespace: System
 * @see https://developer.salesforce.com/docs/atlas.en-us.apexref.meta/apexref/apex_methods_system_set.htm
 */
public class Set<T> {
	/**
	 * Adds an element to the set if it is not already present.
	 * @param element The element to add
	 * @return true if the element was added, false if it was already present
	 */
	public Boolean add(T element) { }

	/**
	 * Adds all of the elements in the specified list to the set.
	 * @param fromList The list containing elements to add
	 * @return true if the set was modified
	 */
	public Boolean addAll(List<T> fromList) { }

	/**
	 * Adds all of the elements in the specified set to the set.
	 * @param fromSet The set containing elements to add
	 * @return true if the set was modified
	 */
	public Boolean addAll(Set<T> fromSet) { }

	/**
	 * Removes all elements from the set, consequently setting the set's size to zero.
	 */
	public void clear() { }

	/**
	 * Creates a shallow copy of the set.
	 * @return A new set that is a copy of the original set
	 */
	public Set<T> clone() { }

	/**
	 * Returns true if the set contains the specified element.
	 * @param element The element to check for
	 * @return true if the element is in the set, false otherwise
	 */
	public Boolean contains(T element) { }

	/**
	 * Returns true if the set contains all of the elements in the specified list.
	 * @param fromList The list to check
	 * @return true if all elements are in the set, false otherwise
	 */
	public Boolean containsAll(List<T> fromList) { }

	/**
	 * Returns true if the set contains all of the elements in the specified set.
	 * @param fromSet The set to check
	 * @return true if all elements are in the set, false otherwise
	 */
	public Boolean containsAll(Set<T> fromSet) { }

	/**
	 * Returns true if the set has zero elements.
	 * @return true if the set is empty, false otherwise
	 */
	public Boolean isEmpty() { }

	/**
	 * Removes the specified element from the set.
	 * @param element The element to remove
	 * @return true if the element was removed, false if it was not in the set
	 */
	public Boolean remove(Object element) { }

	/**
	 * Removes all of the elements in the specified list from the set.
	 * @param fromList The list containing elements to remove
	 * @return true if the set was modified
	 */
	public Boolean removeAll(List<T> fromList) { }

	/**
	 * Removes all of the elements in the specified set from the set.
	 * @param fromSet The set containing elements to remove
	 * @return true if the set was modified
	 */
	public Boolean removeAll(Set<T> fromSet) { }

	/**
	 * Retains only the elements in the set that are contained in the specified list.
	 * @param fromList The list containing elements to retain
	 * @return true if the set was modified
	 */
	public Boolean retainAll(List<T> fromList) { }

	/**
	 * Retains only the elements in the set that are contained in the specified set.
	 * @param fromSet The set containing elements to retain
	 * @return true if the set was modified
	 */
	public Boolean retainAll(Set<T> fromSet) { }

	/**
	 * Returns the number of elements in the set.
	 * @return The size of the set
	 */
	public Integer size() { }
}

