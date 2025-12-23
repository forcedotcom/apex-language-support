public class VariableMethodCallTestClass {
  public void someMethod() {
    String base64Data = 'test';
    String result = base64Data.toString();
    System.debug(base64Data.toString());
  }
}