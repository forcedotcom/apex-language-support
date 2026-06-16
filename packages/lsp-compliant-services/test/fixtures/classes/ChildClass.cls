public class ChildClass extends BaseClass {
  public String childField;
  private Integer privateChildField;

  public override String getLabel() {
    return 'child';
  }

  public void childMethod() {
    String x = this.baseField;
  }

  public static void staticChildMethod() {
  }
}
