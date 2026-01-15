public class OuterClass {
  public class InnerClass {
    public class NestedInnerClass {
      public NestedInnerClass() {
        System.debug('Nested inner constructor');
      }
    }
    public InnerClass() {
      System.debug('Inner constructor');
    }
  }
}
