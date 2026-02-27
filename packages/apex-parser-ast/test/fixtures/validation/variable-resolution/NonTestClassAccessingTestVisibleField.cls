/**
 * Non-test class accessing @TestVisible private field - should report VARIABLE_NOT_VISIBLE.
 */
public class NonTestClassAccessingTestVisibleField {
  public void someMethod() {
    ClassWithTestVisibleField obj = new ClassWithTestVisibleField();
    String val = obj.testVisibleField;
  }
}
