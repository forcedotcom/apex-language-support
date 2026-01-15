public class OuterClass {
  public class ClassA {
    public ClassA() {
      System.debug('ClassA constructor');
    }
  }
  
  public class ClassB {
    public ClassB() {
      System.debug('ClassB constructor');
    }
  }
}
