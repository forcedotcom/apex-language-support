/**
 * Implement different sort orders with the Comparator interface’s compare() method, and pass the Comparator as a parameter to List.sort() . Your implementation must explicitly handle null inputs in the compare() method to avoid a null pointer exception.
 */
global interface Comparator {

  Integer compare(T var1, T var2);

}