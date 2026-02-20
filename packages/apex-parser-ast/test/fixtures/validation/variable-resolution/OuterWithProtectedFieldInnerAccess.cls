/**
 * Outer class with protected field. Inner class accesses it - should be valid per Apex doc.
 */
public class OuterWithProtectedFieldInnerAccess {
  protected String protectedField = 'outer';

  public class Inner {
    public void useOuterProtected() {
      String val = protectedField;
    }
  }
}
