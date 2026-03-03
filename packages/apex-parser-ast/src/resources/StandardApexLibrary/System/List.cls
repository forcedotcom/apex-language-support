/**
 * Contains methods for the List collection type.
 */
global class List {

  /**
   * Adds an element to the end of the list.
   * @param listElement 
   */
  public void add(Object listElement) {}

  /**
   * Adds an element to the end of the list.
   * @param index 
   * @param listElement 
   */
  public void add(Integer index, Object listElement) {}

  /**
   * Adds all of the elements in the specified list to the list that calls the method. Both lists must be of the same type.
   * @param fromList 
   */
  public void addAll(List fromList) {}

  /**
   * Adds all of the elements in the specified list to the list that calls the method. Both lists must be of the same type.
   * @param fromSet 
   */
  public void addAll(Set fromSet) {}

  /**
   * Removes all elements from a list, consequently setting the list's length to zero.
   */
  public void clear() {}

  /**
   * Makes a duplicate copy of a list.
   * @return List< Object >
   */
  public List< Object > clone() {}

  /**
   * Returns true if the list contains the specified element.
   * @param listElement 
   * @return Boolean
   */
  public Boolean contains(Object listElement) {}

  /**
   * Makes a duplicate copy of a list of sObject records, including the sObject records themselves.
   * @param preserveId The optional preserveId argument determines whether the IDs of the original objects are preserved or cleared in the duplicates. If set to true , the IDs are copied to the cloned objects. The default is false , that is, the IDs are cleared.
   * @param preserveReadonlyTimestamps The optional preserveReadonlyTimestamps argument determines whether the read-only timestamp and user ID fields are preserved or cleared in the duplicates. If set to true , the read-only fields CreatedById , CreatedDate , LastModifiedById , and LastModifiedDate are copied to the cloned objects. The default is false , that is, the values are cleared.
   * @param preserveAutonumber The optional preserveAutonumber argument determines whether the autonumber fields of the original objects are preserved or cleared in the duplicates. If set to true , auto number fields are copied to the cloned objects. The default is false , that is, auto number fields are cleared.
   * @return List< Object >
   */
  public List< Object > deepClone(Boolean preserveId, Boolean preserveReadonlyTimestamps, Boolean preserveAutonumber) {}

  /**
   * Compares this list with the specified list and returns true if both lists are equal; otherwise, returns false .
   * @param list2 The list to compare this list with.
   * @return Boolean
   */
  public Boolean equals(List list2) {}

  /**
   * Returns the list element stored at the specified index.
   * @param index 
   * @return Object
   */
  public Object get(Integer index) {}

  /**
   * Returns the token of the sObject type that makes up a list of sObjects.
   * @return Schema.SObjectType
   */
  public Schema.SObjectType getSObjectType() {}

  /**
   * Returns the hashcode corresponding to this list and its contents.
   * @return Integer
   */
  public Integer hashCode() {}

  /**
   * Returns the index of the first occurrence of the specified element in this list. If this list does not contain the element, returns -1.
   * @param listElement 
   * @return Integer
   */
  public Integer indexOf(Object listElement) {}

  /**
   * Returns true if the list has zero elements.
   * @return Boolean
   */
  public Boolean isEmpty() {}

  /**
   * Returns an instance of an iterator for this list.
   * @return Iterator
   */
  public Iterator iterator() {}

  /**
   * Removes the list element stored at the specified index, returning the element that was removed.
   * @param index 
   * @return Object
   */
  public Object remove(Integer index) {}

  /**
   * Sets the specified value for the element at the given index.
   * @param index The index of the list element to set.
   * @param listElement The value of the list element to set.
   */
  public void set(Integer index, Object listElement) {}

  /**
   * Returns the number of elements in the list.
   * @return Integer
   */
  public Integer size() {}

  /**
   * Sorts the items in the list in ascending order.
   */
  public void sort() {}

  /**
   * Returns the string representation of the list.
   * @return String
   */
  public String toString() {}

}