/**
 * @isTest class that calls @TestVisible private method - should be allowed.
 */
@isTest
public class TestClassAccessingTestVisibleMethod {
  @isTest
  static void testCall() {
    ClassWithTestVisibleMethod obj = new ClassWithTestVisibleMethod();
    String val = obj.getSecret();
  }
}
