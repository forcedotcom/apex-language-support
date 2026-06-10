/**
 * Represents a collection of unique elements with no duplicate values.
 */
global class Set {

  global Set() {}

  /**
   * Adds an element to the set if it is not already present.
   * @param setElement 
   * @return Boolean
   */
  global Boolean add(Object setElement) {}

  /**
   * Adds all of the elements in the specified list to the set if they are not already present.
   * @param fromList 
   * @return Boolean
   */
  global Boolean addAll(List<Object> fromList) {}

  /**
   * Adds all of the elements in the specified list to the set if they are not already present.
   * @param fromSet 
   * @return Boolean
   */
  global Boolean addAll(Set<Object> fromSet) {}

  /**
   * Removes all of the elements from the set.
   */
  global void clear() {}

  /**
   * Makes a duplicate copy of the set.
   * @return Set<Object>
   */
  global Set<Object> clone() {}

  /**
   * Returns true if the set contains the specified element.
   * @param setElement 
   * @return Boolean
   */
  global Boolean contains(Object setElement) {}

  /**
   * Returns true if the set contains all of the elements in the specified list. The list must be of the same type as the set that calls the method.
   * @param listToCompare 
   * @return Boolean
   */
  global Boolean containsAll(List<Object> listToCompare) {}

  /**
   * Returns true if the set contains all of the elements in the specified list. The list must be of the same type as the set that calls the method.
   * @param setToCompare 
   * @return Boolean
   */
  global Boolean containsAll(Set<Object> setToCompare) {}

  /**
   * Compares this set with the specified set and returns true if both sets are equal; otherwise, returns false .
   * @param set2 The set2 argument is the set to compare this set with.
   * @return Boolean
   */
  global Boolean equals(Set<Object> set2) {}

  /**
   * Returns the hashcode corresponding to this set and its contents.
   * @return Integer
   */
  global Integer hashCode() {}

  /**
   * Returns true if the set has zero elements.
   * @return Boolean
   */
  global Boolean isEmpty() {}

  /**
   * Removes the specified element from the set if it is present.
   * @param setElement 
   * @return Boolean
   */
  global Boolean remove(Object setElement) {}

  /**
   * Removes the elements in the specified list from the set if they are present.
   * @param listOfElementsToRemove 
   * @return Boolean
   */
  global Boolean removeAll(List<Object> listOfElementsToRemove) {}

  /**
   * Removes the elements in the specified list from the set if they are present.
   * @param setOfElementsToRemove 
   * @return Boolean
   */
  global Boolean removeAll(Set<Object> setOfElementsToRemove) {}

  /**
   * Retains only the elements in this set that are contained in the specified list.
   * @param listOfElementsToRetain 
   * @return Boolean
   */
  global Boolean retainAll(List<Object> listOfElementsToRetain) {}

  /**
   * Retains only the elements in this set that are contained in the specified list.
   * @param setOfElementsToRetain 
   * @return Boolean
   */
  global Boolean retainAll(Set setOfElementsToRetain) {}

  /**
   * Returns the number of elements in the set (its cardinality).
   * @return Integer
   */
  global Integer size() {}

  /**
   * Returns the string representation of the set.
   * @return String
   */
  global String toString() {}

}