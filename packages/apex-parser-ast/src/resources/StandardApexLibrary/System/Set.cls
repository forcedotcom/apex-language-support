/**
 * Represents a collection of unique elements with no duplicate values.
 */
global class Set {

  /**
   * Adds an element to the set if it is not already present.
   * @param setElement 
   * @return Boolean
   */
  public Boolean add(Object setElement) {}

  /**
   * Adds all of the elements in the specified list to the set if they are not already present.
   * @param fromList 
   * @return Boolean
   */
  public Boolean addAll(List<Object> fromList) {}

  /**
   * Adds all of the elements in the specified list to the set if they are not already present.
   * @param fromSet 
   * @return Boolean
   */
  public Boolean addAll(Set<Object> fromSet) {}

  /**
   * Removes all of the elements from the set.
   */
  public void clear() {}

  /**
   * Makes a duplicate copy of the set.
   * @return Set<Object>
   */
  public Set<Object> clone() {}

  /**
   * Returns true if the set contains the specified element.
   * @param setElement 
   * @return Boolean
   */
  public Boolean contains(Object setElement) {}

  /**
   * Returns true if the set contains all of the elements in the specified list. The list must be of the same type as the set that calls the method.
   * @param listToCompare 
   * @return Boolean
   */
  public Boolean containsAll(List<Object> listToCompare) {}

  /**
   * Returns true if the set contains all of the elements in the specified list. The list must be of the same type as the set that calls the method.
   * @param setToCompare 
   * @return Boolean
   */
  public Boolean containsAll(Set<Object> setToCompare) {}

  /**
   * Compares this set with the specified set and returns true if both sets are equal; otherwise, returns false .
   * @param set2 The set2 argument is the set to compare this set with.
   * @return Boolean
   */
  public Boolean equals(Set<Object> set2) {}

  /**
   * Returns the hashcode corresponding to this set and its contents.
   * @return Integer
   */
  public Integer hashCode() {}

  /**
   * Returns true if the set has zero elements.
   * @return Boolean
   */
  public Boolean isEmpty() {}

  /**
   * Removes the specified element from the set if it is present.
   * @param setElement 
   * @return Boolean
   */
  public Boolean remove(Object setElement) {}

  /**
   * Removes the elements in the specified list from the set if they are present.
   * @param listOfElementsToRemove 
   * @return Boolean
   */
  public Boolean removeAll(List<Object> listOfElementsToRemove) {}

  /**
   * Removes the elements in the specified list from the set if they are present.
   * @param setOfElementsToRemove 
   * @return Boolean
   */
  public Boolean removeAll(Set<Object> setOfElementsToRemove) {}

  /**
   * Retains only the elements in this set that are contained in the specified list.
   * @param listOfElementsToRetain 
   * @return Boolean
   */
  public Boolean retainAll(List<Object> listOfElementsToRetain) {}

  /**
   * Retains only the elements in this set that are contained in the specified list.
   * @param setOfElementsToRetain 
   * @return Boolean
   */
  public Boolean retainAll(Set setOfElementsToRetain) {}

  /**
   * Returns the number of elements in the set (its cardinality).
   * @return Integer
   */
  public Integer size() {}

  /**
   * Returns the string representation of the set.
   * @return String
   */
  public String toString() {}

}