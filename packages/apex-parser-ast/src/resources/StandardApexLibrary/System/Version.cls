/**
 * Use the Version methods to get the version of a first-generation managed package (1GP) or a migrated second-generation managed package (2GP), and to compare package versions.
 */
global class Version {

  global Version(Integer major, Integer minor) {}

  global Version(Integer major, Integer minor, Integer patch) {}

  /**
   * Compares the current version with the specified version.
   * @param version 
   * @return Integer
   */
  global Integer compareTo(System.Version version) {}

  /**
   * Returns the major package version of the of the calling code.
   * @return Integer
   */
  global Integer major() {}

  /**
   * Returns the minor package version of the calling code.
   * @return Integer
   */
  global Integer minor() {}

  /**
   * Returns the patch package version of the calling code or null if there is no patch version.
   * @return Integer
   */
  global Integer patch() {}

  global Object clone() {}

}