public class MemberAccessTestClass {
  public String publicField;
  private Integer privateField;
  public static String staticField;

  public String getPublicValue() {
    return publicField;
  }

  private void privateMethod() {
  }

  public static String getStaticValue() {
    return staticField;
  }

  public void testMemberAccess() {
    MemberAccessTestClass instance = new MemberAccessTestClass();
    String val = instance.publicField;
  }
}
