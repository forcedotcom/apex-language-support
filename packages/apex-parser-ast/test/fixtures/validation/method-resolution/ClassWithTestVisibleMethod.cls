/**
 * Class with @TestVisible private method for test access.
 */
public class ClassWithTestVisibleMethod {
  @TestVisible
  private String getSecret() {
    return 'secret';
  }

  public String getPublic() {
    return getSecret();
  }
}
