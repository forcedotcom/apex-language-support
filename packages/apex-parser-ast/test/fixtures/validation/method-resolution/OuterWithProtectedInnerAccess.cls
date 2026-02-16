/**
 * Outer class with protected method. Inner class accesses it - should be valid per Apex doc.
 */
public class OuterWithProtectedInnerAccess {
  protected String getProtectedValue() {
    return 'outer';
  }

  public class Inner {
    public void useOuterProtected() {
      String val = getProtectedValue();
    }
  }
}
