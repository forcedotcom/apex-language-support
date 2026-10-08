public class NestedClassBreakpoints {
  public void outer() {
    Integer value = 1;
    System.debug(value);
  }

  public class InnerClass {
    public void inner() {
      Integer value = 2;
      System.debug(value);
    }
  }
}
