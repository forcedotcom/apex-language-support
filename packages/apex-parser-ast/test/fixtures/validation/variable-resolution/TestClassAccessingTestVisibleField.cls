/**
 * @isTest class that accesses @TestVisible private field - should be allowed.
 */
@isTest
public class TestClassAccessingTestVisibleField {
  @isTest
  static void testAccess() {
    ClassWithTestVisibleField obj = new ClassWithTestVisibleField();
    String val = obj.testVisibleField;
    obj.testVisibleField = 'updated';
  }
}
