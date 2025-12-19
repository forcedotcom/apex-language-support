public class TestClass {
  public String testField;
  
  public void myTestMethod() {
    String localVar = 'test';
  }
  
  public class InnerClass {
    public String innerField;
    
    public void innerMethod() {
      String innerLocalVar = 'inner';
    }
  }
  
  public interface TestInterface {
    void interfaceMethod();
  }
  
  public enum TestEnum {
    VALUE1, VALUE2
  }
}
