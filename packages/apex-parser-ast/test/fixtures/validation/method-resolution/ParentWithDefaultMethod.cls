/**
 * Parent class with default (private) visibility method.
 * Per Apex doc: no modifier = private. Subclasses cannot access.
 */
public virtual class ParentWithDefaultMethod {
  // No modifier = private per Apex doc
  String getDefaultValue() {
    return 'parent';
  }

  public String getPublicValue() {
    return getDefaultValue(); // Same class - OK
  }
}
