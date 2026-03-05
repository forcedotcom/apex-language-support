/**
 * @isTest class with inner class. Inner class calls @TestVisible method - should be allowed.
 */
@isTest
public class TestClassWithInnerAccessingTestVisibleMethod {
  public class Inner {
    public void callTestVisible() {
      ClassWithTestVisibleMethod obj = new ClassWithTestVisibleMethod();
      String val = obj.getSecret();
    }
  }
}
