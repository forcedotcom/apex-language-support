public virtual class BaseClass {
  public String baseField;
  private String privateBaseField;
  public static String staticBaseField;

  public virtual String getLabel() {
    return 'base';
  }

  public virtual void doWork(Integer count) {
  }

  public void concreteMethod() {
  }

  public static void staticBaseMethod() {
  }
}
