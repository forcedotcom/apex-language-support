/**
 * Contains methods for the List collection type.
 * Namespace: System
 * @see https://developer.salesforce.com/docs/atlas.en-us.apexref.meta/apexref/apex_methods_system_list.htm
 */
public class List {
	/**
	 * Adds an element to the end of the list.
	 * @param element The element to add
	 * @return true if the element was added successfully
	 */
	public Boolean add(T element) { }

	/**
	 * Adds an element at the specified index position.
	 * @param index The index at which to add the element
	 * @param element The element to add
	 */
	public void add(Integer index, T element) { }

	/**
	 * Adds all of the elements in the specified list to the list that calls the method.
	 * @param fromList The list containing elements to add
	 * @return true if the list was modified
	 */
	public Boolean addAll(List<T> fromList) { }

	/**
	 * Adds all of the elements in the specified set to the list that calls the method.
	 * @param fromSet The set containing elements to add
	 * @return true if the list was modified
	 */
	public Boolean addAll(Set<T> fromSet) { }

	/**
	 * Removes all elements from the list, consequently setting the list's length to zero.
	 */
	public void clear() { }

	/**
	 * Creates a shallow copy of the list.
	 * @return A new list that is a copy of the original list
	 */
	public List<T> clone() { }

	/**
	 * Returns true if the list contains the specified element.
	 * @param element The element to check for
	 * @return true if the element is in the list, false otherwise
	 */
	public Boolean contains(T element) { }

	/**
	 * Returns the element at the specified index.
	 * @param index The index of the element to return
	 * @return The element at the specified index
	 */
	public T get(Integer index) { }

	/**
	 * Returns the index of the first occurrence of the specified element.
	 * @param element The element to search for
	 * @return The index of the element, or -1 if not found
	 */
	public Integer indexOf(T element) { }

	/**
	 * Returns true if the list has zero elements.
	 * @return true if the list is empty, false otherwise
	 */
	public Boolean isEmpty() { }

	/**
	 * Removes the list element at the specified index, returning the element that was removed.
	 * @param index The index of the element to remove
	 * @return The element that was removed
	 */
	public T remove(Integer index) { }

	/**
	 * Removes the first occurrence of the specified element from the list.
	 * @param element The element to remove
	 * @return true if the element was removed, false otherwise
	 */
	public Boolean remove(Object element) { }

	/**
	 * Sets the element at the specified index to the specified value.
	 * @param index The index of the element to set
	 * @param element The new value
	 * @return The element that was previously at the specified index
	 */
	public T set(Integer index, T element) { }

	/**
	 * Returns the number of elements in the list.
	 * @return The size of the list
	 */
	public Integer size() { }

	/**
	 * Sorts the list in ascending order.
	 */
	public void sort() { }
}

