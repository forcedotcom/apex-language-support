/**
 * Class with @TestVisible private field for test access.
 */
public class ClassWithTestVisibleField {
  @TestVisible
  private String testVisibleField = 'secret';

  public String getPublicField() {
    return testVisibleField;
  }
}
