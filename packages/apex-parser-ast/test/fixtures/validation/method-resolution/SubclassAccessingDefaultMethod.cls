/**
 * Subclass that tries to access parent's default (private) method.
 * Per Apex doc: default = private, so this should report INVALID_METHOD_NOT_FOUND.
 */
public class SubclassAccessingDefaultMethod extends ParentWithDefaultMethod {
  public void testAccess() {
    getDefaultValue(); // Error: default = private, not visible to subclass
  }
}
