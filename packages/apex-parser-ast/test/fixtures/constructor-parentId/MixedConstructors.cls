public class OuterClass {
  public OuterClass() {
    System.debug('Outer constructor');
  }
  public class InnerClass {
    public InnerClass() {
      System.debug('Inner constructor');
    }
  }
}
