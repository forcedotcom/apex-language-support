/**
 * @isTest class with inner class. Inner class accesses @TestVisible field - should be allowed.
 */
@isTest
public class TestClassWithInnerAccessingTestVisible {
  public class Inner {
    public void accessTestVisible() {
      ClassWithTestVisibleField obj = new ClassWithTestVisibleField();
      String val = obj.testVisibleField;
    }
  }
}
