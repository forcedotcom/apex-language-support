/**
 * Provides methods to retrieve a custom label or to check if translation exists for a label in a specific language and namespace. Label names are dynamically resolved at run time, overriding the user’s current language if a translation exists for the requested language. You can’t access labels that are protected in a different namespace.
 */
global class Label {

  public static String get(String namespace, String label) {}

  public static String get(String namespace, String label, String language) {}

  public static Boolean translationExists(string namespace, string label, string language) {}

}