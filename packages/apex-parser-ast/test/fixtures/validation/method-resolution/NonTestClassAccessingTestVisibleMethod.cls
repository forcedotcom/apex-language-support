/**
 * Non-test class calling @TestVisible private method - should report METHOD_NOT_VISIBLE.
 */
public class NonTestClassAccessingTestVisibleMethod {
  public void someMethod() {
    ClassWithTestVisibleMethod obj = new ClassWithTestVisibleMethod();
    String val = obj.getSecret();
  }
}
